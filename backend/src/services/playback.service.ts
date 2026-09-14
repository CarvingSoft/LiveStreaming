import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { PlaybackTokenPayload, StreamStatus } from '../types';
import { fetchHlsManifestFromMediaMtx } from '../utils/mediamtx-fetch';
import { mediaMtxService } from './mediamtx.service';

export interface PlaybackSession {
  token: string;
  whepUrl: string;
  hlsUrl: string;
  status: StreamStatus;
  expiresAt: string;
  cameraName: string;
}

export class PlaybackService {
  issueToken(payload: Omit<PlaybackTokenPayload, 'type'>): { token: string; expiresAt: Date } {
    const expiresAt = new Date(Date.now() + env.PLAYBACK_TOKEN_TTL_SECONDS * 1000);
    const token = jwt.sign(
      {
        ...payload,
        type: 'playback',
      } satisfies PlaybackTokenPayload,
      env.PLAYBACK_JWT_SECRET,
      { expiresIn: env.PLAYBACK_TOKEN_TTL_SECONDS },
    );

    return { token, expiresAt };
  }

  verifyToken(token: string): PlaybackTokenPayload {
    const decoded = jwt.verify(token, env.PLAYBACK_JWT_SECRET) as PlaybackTokenPayload;
    if (decoded.type !== 'playback') {
      throw new Error('Invalid playback token type');
    }
    return decoded;
  }

  buildPublicUrls(token: string, apiPublicBase?: string): { whepUrl: string; hlsUrl: string } {
    const apiBase = (apiPublicBase ?? env.API_PUBLIC_URL).replace(/\/$/, '');
    return {
      whepUrl: `${apiBase}/api/stream/whep/${token}`,
      hlsUrl: `${apiBase}/api/stream/hls/${token}/index.m3u8`,
    };
  }

  private async warmUpHlsPath(mediamtxPath: string): Promise<void> {
    const hlsUrl = mediaMtxService.getHlsInternalUrl(mediamtxPath, 'index.m3u8');
    try {
      const response = await fetchHlsManifestFromMediaMtx(hlsUrl, { maxWaitMs: 20_000 });
      if (!response.ok) {
        console.warn(`HLS warm-up for ${mediamtxPath} returned ${response.status}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      console.warn(`HLS warm-up for ${mediamtxPath} failed: ${message}`);
    }
  }

  async createSession(input: {
    siteSlug: string;
    cameraKey: string;
    mediamtxPath: string;
    cameraName: string;
    isActive: boolean;
    apiPublicBase?: string;
  }): Promise<PlaybackSession> {
    if (input.isActive) {
      // Non-blocking — warm-up must not delay the playback API (nginx/browser timeouts).
      void this.warmUpHlsPath(input.mediamtxPath);
    }

    const pathStatus = await mediaMtxService.getPath(input.mediamtxPath);
    const status = mediaMtxService.mapPathStatus(pathStatus, input.isActive);
    const { token, expiresAt } = this.issueToken({
      siteSlug: input.siteSlug,
      cameraKey: input.cameraKey,
      mediamtxPath: input.mediamtxPath,
    });
    const urls = this.buildPublicUrls(token, input.apiPublicBase);

    return {
      token,
      whepUrl: urls.whepUrl,
      hlsUrl: urls.hlsUrl,
      status,
      expiresAt: expiresAt.toISOString(),
      cameraName: input.cameraName,
    };
  }
}

export const playbackService = new PlaybackService();
