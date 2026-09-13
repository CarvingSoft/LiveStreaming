import { Router } from 'express';
import { env } from '../config/env';
import { playbackService } from '../services/playback.service';
import { mediaMtxService } from '../services/mediamtx.service';
import { AppError } from '../utils/errors';
import { paramString } from '../utils/params';
import { fetchFromMediaMtx, fetchHlsManifestFromMediaMtx } from '../utils/mediamtx-fetch';
import { getRequestApiBase } from '../utils/request-base';

export const streamRouter = Router();

streamRouter.options('/whep/:token', (_req, res) => {
  res.status(204).send();
});

streamRouter.post('/whep/:token', async (req, res, next) => {
  try {
    const payload = playbackService.verifyToken(paramString(req, 'token'));
    const whepUrl = mediaMtxService.getWhepInternalUrl(payload.mediamtxPath);
    const offerSdp =
      typeof req.body === 'string'
        ? req.body
        : typeof req.body?.sdp === 'string'
          ? req.body.sdp
          : '';

    if (!offerSdp || typeof offerSdp !== 'string') {
      throw new AppError(400, 'SDP offer is required');
    }

    const response = await fetch(whepUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sdp',
        Accept: 'application/sdp',
      },
      body: offerSdp,
      signal: AbortSignal.timeout(15000),
    });

    const answerSdp = await response.text();

    if (!response.ok) {
      throw new AppError(response.status === 404 ? 404 : 502, 'Unable to establish WebRTC playback session');
    }

    res.setHeader('Content-Type', 'application/sdp');
    res.setHeader('Location', req.originalUrl);
    res.status(response.status).send(answerSdp);
  } catch (error) {
    next(error);
  }
});

streamRouter.get('/hls/:token/:file', async (req, res, next) => {
  try {
    const payload = playbackService.verifyToken(paramString(req, 'token'));
    const wildcard = paramString(req, 'file') || 'index.m3u8';
    const hlsUrl = mediaMtxService.getHlsInternalUrl(payload.mediamtxPath, wildcard);

    const response = wildcard.endsWith('.m3u8')
      ? await fetchHlsManifestFromMediaMtx(hlsUrl)
      : await fetchFromMediaMtx(hlsUrl);

    if (!response.ok) {
      const hint =
        response.status === 404
          ? 'Stream path not found in MediaMTX. Re-save the camera in admin or run npm run sync:mediamtx:prod.'
          : 'MediaMTX could not serve HLS. Check DVR IP is reachable from EC2 (not a local 192.168.x.x address), RTSP port/credentials, and mediamtx logs.';
      throw new AppError(response.status === 404 ? 404 : 502, hint);
    }

    const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
    let bodyBuffer = Buffer.from(await response.arrayBuffer());

    if (wildcard.endsWith('.m3u8')) {
      const manifest = bodyBuffer.toString('utf8');
      const token = paramString(req, 'token');
      const rewritten = manifest
        .split('\n')
        .map((line) => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) {
            return line;
          }
          const segmentName = trimmed.split('/').pop() ?? trimmed;
          const apiBase = getRequestApiBase(req);
          return `${apiBase}/api/stream/hls/${token}/${segmentName}`;
        })
        .join('\n');
      bodyBuffer = Buffer.from(rewritten, 'utf8');
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-store');
    res.status(response.status).send(bodyBuffer);
  } catch (error) {
    next(error);
  }
});
