import { env } from '../config/env';
import { mediaMtxService } from './mediamtx.service';
import {
  removeSiteFromMediaMtx,
  syncCameraToMediaMtx,
  syncSiteCamerasToMediaMtx,
} from './mediamtx-sync.service';

type CameraSyncInput = Parameters<typeof syncCameraToMediaMtx>[0];

const siteLastActivity = new Map<string, number>();
let pruneTimer: NodeJS.Timeout | null = null;

export function touchSiteActivity(siteSlug: string): void {
  if (!env.STREAM_ON_DEMAND) {
    return;
  }
  siteLastActivity.set(siteSlug, Date.now());
}

export function clearSiteActivity(siteSlug: string): void {
  siteLastActivity.delete(siteSlug);
}

export function isSiteStreamingActive(siteSlug: string): boolean {
  if (!env.STREAM_ON_DEMAND) {
    return true;
  }

  const lastSeen = siteLastActivity.get(siteSlug);
  if (!lastSeen) {
    return false;
  }

  return Date.now() - lastSeen < env.SITE_STREAM_IDLE_MS;
}

/**
 * Register MediaMTX paths for a site when a viewer requests playback.
 * RTSP/HLS still start only when MediaMTX has readers (sourceOnDemand).
 */
export async function ensureSiteStreaming(siteSlug: string, camera: CameraSyncInput): Promise<void> {
  if (!env.STREAM_ON_DEMAND) {
    if (!(await mediaMtxService.hasConfigPath(camera.mediamtxPath))) {
      await syncCameraToMediaMtx(camera);
    }
    return;
  }

  touchSiteActivity(siteSlug);

  if (!(await mediaMtxService.hasConfigPath(camera.mediamtxPath))) {
    await syncSiteCamerasToMediaMtx(siteSlug);
  }
}

export async function pruneIdleSiteStreams(): Promise<void> {
  if (!env.STREAM_ON_DEMAND) {
    return;
  }

  const now = Date.now();

  for (const [siteSlug, lastSeen] of siteLastActivity) {
    if (now - lastSeen < env.SITE_STREAM_IDLE_MS) {
      continue;
    }

    try {
      await removeSiteFromMediaMtx(siteSlug);
      console.log(`On-demand: removed idle streams for site "${siteSlug}"`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      console.error(`On-demand: failed to prune site "${siteSlug}": ${message}`);
    }

    siteLastActivity.delete(siteSlug);
  }
}

export function startSiteIdlePruner(): void {
  if (!env.STREAM_ON_DEMAND || pruneTimer) {
    return;
  }

  pruneTimer = setInterval(() => {
    void pruneIdleSiteStreams();
  }, env.SITE_IDLE_CHECK_INTERVAL_MS);
}

export function stopSiteIdlePruner(): void {
  if (pruneTimer) {
    clearInterval(pruneTimer);
    pruneTimer = null;
  }
}
