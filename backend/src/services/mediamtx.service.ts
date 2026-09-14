import { env } from '../config/env';
import { StreamStatus } from '../types';

interface MediaMtxPathStatus {
  name: string;
  ready: boolean;
  available?: boolean;
  sourceReady?: boolean;
  tracks?: unknown[];
  bytesReceived?: number;
}

interface MediaMtxHealth {
  ok: boolean;
  message?: string;
}

export class MediaMtxService {
  private readonly apiBase = env.MEDIAMTX_API_URL.replace(/\/$/, '');

  async healthCheck(): Promise<MediaMtxHealth> {
    try {
      const response = await fetch(`${this.apiBase}/v3/paths/list`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) {
        return { ok: false, message: `MediaMTX API returned ${response.status}` };
      }
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'MediaMTX unreachable',
      };
    }
  }

  async upsertPath(pathName: string, source: string): Promise<void> {
    const encodedName = encodeURIComponent(pathName);
    const existing = await this.getPath(pathName);

    const body = JSON.stringify({
      source,
      // Keep RTSP connected in production — on-demand cold starts cause HLS 502/timeouts.
      sourceOnDemand: false,
      rtspTransport: 'tcp',
    });

    const url = existing
      ? `${this.apiBase}/v3/config/paths/patch/${encodedName}`
      : `${this.apiBase}/v3/config/paths/add/${encodedName}`;

    const response = await fetch(url, {
      method: existing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to sync MediaMTX path "${pathName}": ${response.status} ${text}`);
    }
  }

  async deletePath(pathName: string): Promise<void> {
    const encodedName = encodeURIComponent(pathName);
    const response = await fetch(`${this.apiBase}/v3/config/paths/delete/${encodedName}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(10000),
    });

    if (response.status === 404) {
      return;
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to delete MediaMTX path "${pathName}": ${response.status} ${text}`);
    }
  }

  async getPath(pathName: string): Promise<MediaMtxPathStatus | null> {
    const encodedName = encodeURIComponent(pathName);
    const response = await fetch(`${this.apiBase}/v3/paths/get/${encodedName}`, {
      signal: AbortSignal.timeout(5000),
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to read MediaMTX path "${pathName}": ${response.status}`);
    }

    return (await response.json()) as MediaMtxPathStatus;
  }

  mapPathStatus(pathStatus: MediaMtxPathStatus | null, isActive: boolean): StreamStatus {
    if (!isActive) {
      return 'disabled';
    }

    if (!pathStatus) {
      return 'offline';
    }

    const sourceReady = pathStatus.sourceReady ?? pathStatus.available;

    if (pathStatus.ready && sourceReady !== false) {
      return 'online';
    }

    return 'connecting';
  }

  getWhepInternalUrl(mediamtxPath: string): string {
    return `${env.MEDIAMTX_WEBRTC_URL.replace(/\/$/, '')}/${mediamtxPath}/whep`;
  }

  getHlsInternalUrl(mediamtxPath: string, suffix = 'index.m3u8'): string {
    const base = env.MEDIAMTX_HLS_URL.replace(/\/$/, '');
    return `${base}/${mediamtxPath}/${suffix}`;
  }
}

export const mediaMtxService = new MediaMtxService();
