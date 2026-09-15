import net from 'net';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { env } from '../config/env';
import { Camera } from '../models/camera.model';
import { Site } from '../models/site.model';
import { decryptJson } from '../services/encryption.service';
import { mediaMtxService } from '../services/mediamtx.service';
import { buildRtspUrl } from '../services/rtsp-builder.service';
import { syncCameraToMediaMtx } from '../services/mediamtx-sync.service';
import { RtspSourceConfig } from '../types';
import { isPrivateHost } from '../utils/network';

function redactRtspUrl(url: string): string {
  return url.replace(/\/\/([^:/@]+):([^@/]+)@/, '//$1:***@');
}

async function tcpCheck(host: string, port: number, timeoutMs = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port, timeout: timeoutMs });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function fetchJson(url: string): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function probeHls(mediamtxPath: string): Promise<{ ok: boolean; status: number; head: string }> {
  const url = `${env.MEDIAMTX_HLS_URL.replace(/\/$/, '')}/${mediamtxPath}/index.m3u8?cookieCheck=1`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    const text = (await response.text()).split('\n')[0]?.trim() ?? '';
    return { ok: response.ok && text === '#EXTM3U', status: response.status, head: text.slice(0, 80) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, status: 0, head: message };
  }
}

async function diagnoseCamera(
  camera: {
    name: string;
    mediamtxPath: string;
    encryptedSourceConfig?: string;
    sourceType: string;
    isActive: boolean;
  },
  siteSlug: string,
  options: { fix: boolean },
): Promise<boolean> {
  let ok = true;
  console.log(`\n==> ${camera.name} (${siteSlug}/${camera.mediamtxPath})`);

  if (!camera.isActive || camera.sourceType !== 'rtsp') {
    console.log('  SKIP inactive or non-RTSP camera');
    return true;
  }

  if (!camera.encryptedSourceConfig) {
    console.log('  FAIL no encrypted RTSP config — re-save camera in admin');
    return false;
  }

  let sourceConfig: RtspSourceConfig;
  try {
    sourceConfig = decryptJson<RtspSourceConfig>(camera.encryptedSourceConfig);
  } catch {
    console.log('  FAIL cannot decrypt credentials — delete camera and create again with RTSP password');
    return false;
  }

  const rtspUrl = buildRtspUrl(sourceConfig);
  console.log(`  RTSP target: ${sourceConfig.host}:${sourceConfig.port} channel=${sourceConfig.channel} subtype=${sourceConfig.subtype}`);
  console.log(`  RTSP URL:    ${redactRtspUrl(rtspUrl)}`);

  if (isPrivateHost(sourceConfig.host)) {
    console.log('  FAIL host is a private LAN IP — EC2 cannot reach it. Use the DVR public IP (e.g. 59.96.60.54:11554).');
    ok = false;
  }

  const tcpOk = await tcpCheck(sourceConfig.host, sourceConfig.port);
  if (tcpOk) {
    console.log(`  OK   TCP ${sourceConfig.host}:${sourceConfig.port} reachable`);
  } else {
    console.log(`  FAIL TCP ${sourceConfig.host}:${sourceConfig.port} unreachable — check port-forward and DVR firewall (EC2 IP: curl -s ifconfig.me)`);
    ok = false;
  }

  const apiBase = env.MEDIAMTX_API_URL.replace(/\/$/, '');
  const encodedPath = encodeURIComponent(camera.mediamtxPath);
  const configPath = await fetchJson(`${apiBase}/v3/config/paths/get/${encodedPath}`);
  if (!configPath) {
    console.log(
      env.STREAM_ON_DEMAND
        ? '  WARN path missing — open live page or re-save camera in admin'
        : '  FAIL path missing in MediaMTX config — run: npm run sync:mediamtx:prod',
    );
    if (!env.STREAM_ON_DEMAND) {
      ok = false;
    }
    ok = false;
  } else {
    const source = String(configPath.source ?? '');
    const onDemand = configPath.sourceOnDemand;
    console.log(`  Config source: ${redactRtspUrl(source)}`);
    const expectOnDemand = env.STREAM_ON_DEMAND;
    console.log(`  Config sourceOnDemand: ${String(onDemand)} (expect ${expectOnDemand})`);
    if (onDemand !== expectOnDemand) {
      console.log(
        `  FAIL sourceOnDemand mismatch — re-save camera or npm run sync:mediamtx${expectOnDemand ? '' : ':prod'}`,
      );
      ok = false;
    }
    if (source && source !== rtspUrl) {
      console.log('  WARN MediaMTX source URL differs from DB — will re-sync');
      ok = false;
    }
  }

  const runtimePath = await fetchJson(`${apiBase}/v3/paths/get/${encodedPath}`);
  if (!runtimePath) {
    console.log('  FAIL path not running in MediaMTX — RTSP pull never started');
    ok = false;
  } else {
    const ready = runtimePath.ready;
    const sourceReady = runtimePath.sourceReady;
    const bytesReceived = runtimePath.bytesReceived ?? 0;
    const tracks = Array.isArray(runtimePath.tracks) ? runtimePath.tracks.length : 0;
    console.log(`  Runtime ready=${String(ready)} sourceReady=${String(sourceReady)} bytesReceived=${String(bytesReceived)} tracks=${tracks}`);
    if (!ready || bytesReceived === 0 || tracks === 0) {
      console.log('  FAIL no video from DVR — wrong RTSP port/credentials/channel, or DVR rejected RTSP after TCP connect');
      ok = false;
    }
  }

  const hls = await probeHls(camera.mediamtxPath);
  if (hls.ok) {
    console.log('  OK   HLS index.m3u8 returns #EXTM3U');
  } else {
    console.log(`  FAIL HLS index.m3u8 status=${hls.status} head="${hls.head}"`);
    ok = false;
  }

  if (options.fix && !ok) {
    console.log('  --> Re-syncing path to MediaMTX...');
    try {
      await syncCameraToMediaMtx(camera);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      const retry = await probeHls(camera.mediamtxPath);
      if (retry.ok) {
        console.log('  OK   HLS recovered after re-sync');
        ok = true;
      } else {
        console.log(`  FAIL still no HLS after re-sync (status=${retry.status})`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`  FAIL re-sync error: ${message}`);
    }
  }

  return ok;
}

async function main() {
  const pathFilter = process.argv.find((arg) => !arg.startsWith('-') && arg !== process.argv[0] && arg !== process.argv[1]);
  const fix = process.argv.includes('--fix');

  console.log('==> RTSP / MediaMTX connectivity diagnostic');
  console.log(`    EC2 outbound IP check: curl -s ifconfig.me`);
  console.log(`    MediaMTX API: ${env.MEDIAMTX_API_URL}`);
  console.log(`    MediaMTX HLS: ${env.MEDIAMTX_HLS_URL}`);

  await connectDatabase();

  try {
    const cameras = await Camera.find({ isActive: true }).sort({ createdAt: 1 });
    let allOk = true;

    for (const camera of cameras) {
      if (pathFilter && camera.mediamtxPath !== pathFilter && camera.cameraKey !== pathFilter) {
        continue;
      }

      const site = await Site.findById(camera.siteId).select('slug name');
      const siteSlug = site?.slug ?? 'unknown';
      const cameraOk = await diagnoseCamera(camera, siteSlug, { fix });
      if (!cameraOk) {
        allOk = false;
      }
    }

    if (cameras.length === 0) {
      console.log('\nNo active cameras in database.');
    }

    console.log('');
    if (allOk) {
      console.log('All checks passed.');
    } else {
      console.log('Some checks failed.');
      console.log('');
      console.log('Common fixes on EC2:');
      console.log('  1. Admin → Edit camera → host=59.96.60.54 port=11554 (not 1154 or 554 unless forwarded)');
      console.log('  2. Re-enter RTSP username/password and Save');
      console.log('  3. cd backend && npm run sync:mediamtx:prod');
      console.log('  4. sudo journalctl -u mediamtx -n 50 --no-pager   # look for RTSP 401/404 errors');
      console.log('  5. Whitelist EC2 Elastic IP on DVR/router if TCP fails');
      process.exitCode = 1;
    }
  } finally {
    await disconnectDatabase();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
