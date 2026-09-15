import { Router } from 'express';
import { playbackService } from '../services/playback.service';
import { mediaMtxService } from '../services/mediamtx.service';
import { touchSiteActivity } from '../services/stream-ondemand.service';
import { AppError } from '../utils/errors';
import {
  collectSetCookie,
  getHlsCookie,
  getPlaybackHlsSession,
  mergeCookieHeader,
  rememberPlaybackHlsSession,
  setHlsCookie,
} from '../utils/hls-cookie-jar';
import {
  buildMediaMtxHlsUrl,
  extractMediaMtxHlsSession,
  fetchFromMediaMtx,
  fetchHlsManifestFromMediaMtx,
  parseSessionFromManifest,
  rewriteHlsManifestForProxy,
} from '../utils/mediamtx-fetch';
import { paramString } from '../utils/params';
import { getRequestApiBase } from '../utils/request-base';

export const streamRouter = Router();

streamRouter.options('/whep/:token', (_req, res) => {
  res.status(204).send();
});

streamRouter.post('/whep/:token', async (req, res, next) => {
  try {
    const payload = playbackService.verifyToken(paramString(req, 'token'));
    touchSiteActivity(payload.siteSlug);
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

const HLS_PROXY_MAX_WAIT_MS = 45_000;

async function fetchHlsFromMediaMtx(
  token: string,
  mediamtxPath: string,
  file: string,
  query: Record<string, unknown>,
): Promise<Response> {
  const effectiveQuery = { ...query };
  const sessionKey =
    typeof effectiveQuery.session === 'string'
      ? effectiveQuery.session
      : Array.isArray(effectiveQuery.session) && typeof effectiveQuery.session[0] === 'string'
        ? effectiveQuery.session[0]
        : getPlaybackHlsSession(token);

  if (sessionKey && !effectiveQuery.session) {
    effectiveQuery.session = sessionKey;
  }

  const hlsBase = mediaMtxService.getHlsPathBaseUrl(mediamtxPath);
  const hlsUrl = buildMediaMtxHlsUrl(hlsBase, file, effectiveQuery);
  const fetchOptions = {
    cookie: getHlsCookie(token, sessionKey),
    maxWaitMs: HLS_PROXY_MAX_WAIT_MS,
  };
  const isManifest = file.endsWith('.m3u8');

  let response = isManifest
    ? await fetchHlsManifestFromMediaMtx(hlsUrl, fetchOptions)
    : await fetchFromMediaMtx(hlsUrl, fetchOptions);

  if (!response.ok && response.status === 401 && isManifest && file !== 'index.m3u8') {
    const indexUrl = buildMediaMtxHlsUrl(hlsBase, 'index.m3u8', {});
    const indexResponse = await fetchFromMediaMtx(indexUrl, fetchOptions);
    const bootstrappedCookie = mergeCookieHeader(
      getHlsCookie(token, sessionKey),
      collectSetCookie(indexResponse),
    );
    if (bootstrappedCookie) {
      setHlsCookie(token, sessionKey, bootstrappedCookie);
      const retryOptions = { cookie: bootstrappedCookie, maxWaitMs: HLS_PROXY_MAX_WAIT_MS };
      response = isManifest
        ? await fetchHlsManifestFromMediaMtx(hlsUrl, retryOptions)
        : await fetchFromMediaMtx(hlsUrl, retryOptions);
    }
  }

  const mergedCookie = mergeCookieHeader(getHlsCookie(token, sessionKey), collectSetCookie(response));
  if (mergedCookie) {
    setHlsCookie(token, sessionKey, mergedCookie);
  }

  return response;
}

function mapHlsFetchError(status: number): AppError {
  if (status === 404) {
    return new AppError(
      404,
      'Stream path not found in MediaMTX. Open the live page to register paths, or re-save the camera in admin.',
    );
  }

  if (status === 401) {
    return new AppError(
      502,
      'MediaMTX rejected HLS sub-playlist (401). Run bash deploy/restart-mediamtx.sh and confirm hlsVariant: fmp4 in /opt/mediamtx/mediamtx.yml.',
    );
  }

  return new AppError(
    503,
    'HLS manifest not ready from MediaMTX. RTSP may be connected but HLS remux is still starting — retry in a few seconds. If logs show "MPEG-TS supports H264 only", run bash deploy/restart-mediamtx.sh (needs hlsVariant: fmp4 for H265 DVRs).',
  );
}

streamRouter.get('/hls/:token/:file', async (req, res, next) => {
  try {
    const token = paramString(req, 'token');
    const payload = playbackService.verifyToken(token);
    touchSiteActivity(payload.siteSlug);
    const wildcard = paramString(req, 'file') || 'index.m3u8';
    const query = { ...req.query } as Record<string, unknown>;

    const response = await fetchHlsFromMediaMtx(token, payload.mediamtxPath, wildcard, query);

    if (!response.ok) {
      const detail = await response.clone().text().catch(() => '');
      console.warn(
        `HLS proxy ${wildcard} for ${payload.mediamtxPath} failed: ${response.status} ${detail.slice(0, 200)}`,
      );
      throw mapHlsFetchError(response.status);
    }

    const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
    let bodyBuffer = Buffer.from(await response.arrayBuffer());

    if (wildcard.endsWith('.m3u8')) {
      const manifest = bodyBuffer.toString('utf8');
      const apiBase = getRequestApiBase(req);
      const sessionFromQuery =
        typeof query.session === 'string'
          ? query.session
          : parseSessionFromManifest(manifest) ??
            extractMediaMtxHlsSession(response) ??
            getPlaybackHlsSession(token);

      if (wildcard === 'index.m3u8' && sessionFromQuery) {
        rememberPlaybackHlsSession(token, sessionFromQuery);
      }

      const rewritten = rewriteHlsManifestForProxy(
        manifest,
        apiBase,
        token,
        sessionFromQuery,
      );
      bodyBuffer = Buffer.from(rewritten, 'utf8');
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-store');
    res.status(response.status).send(bodyBuffer);
  } catch (error) {
    next(error);
  }
});
