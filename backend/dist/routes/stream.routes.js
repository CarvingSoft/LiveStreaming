"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamRouter = void 0;
const express_1 = require("express");
const playback_service_1 = require("../services/playback.service");
const mediamtx_service_1 = require("../services/mediamtx.service");
const stream_ondemand_service_1 = require("../services/stream-ondemand.service");
const errors_1 = require("../utils/errors");
const hls_cookie_jar_1 = require("../utils/hls-cookie-jar");
const mediamtx_fetch_1 = require("../utils/mediamtx-fetch");
const params_1 = require("../utils/params");
const request_base_1 = require("../utils/request-base");
exports.streamRouter = (0, express_1.Router)();
exports.streamRouter.options('/whep/:token', (_req, res) => {
    res.status(204).send();
});
exports.streamRouter.post('/whep/:token', async (req, res, next) => {
    try {
        const payload = playback_service_1.playbackService.verifyToken((0, params_1.paramString)(req, 'token'));
        (0, stream_ondemand_service_1.touchSiteActivity)(payload.siteSlug);
        const whepUrl = mediamtx_service_1.mediaMtxService.getWhepInternalUrl(payload.mediamtxPath);
        const offerSdp = typeof req.body === 'string'
            ? req.body
            : typeof req.body?.sdp === 'string'
                ? req.body.sdp
                : '';
        if (!offerSdp || typeof offerSdp !== 'string') {
            throw new errors_1.AppError(400, 'SDP offer is required');
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
            throw new errors_1.AppError(response.status === 404 ? 404 : 502, 'Unable to establish WebRTC playback session');
        }
        res.setHeader('Content-Type', 'application/sdp');
        res.setHeader('Location', req.originalUrl);
        res.status(response.status).send(answerSdp);
    }
    catch (error) {
        next(error);
    }
});
const HLS_PROXY_MAX_WAIT_MS = 45_000;
async function fetchHlsFromMediaMtx(token, mediamtxPath, file, query) {
    const effectiveQuery = { ...query };
    const sessionKey = typeof effectiveQuery.session === 'string'
        ? effectiveQuery.session
        : Array.isArray(effectiveQuery.session) && typeof effectiveQuery.session[0] === 'string'
            ? effectiveQuery.session[0]
            : (0, hls_cookie_jar_1.getPlaybackHlsSession)(token);
    if (sessionKey && !effectiveQuery.session) {
        effectiveQuery.session = sessionKey;
    }
    const hlsBase = mediamtx_service_1.mediaMtxService.getHlsPathBaseUrl(mediamtxPath);
    const hlsUrl = (0, mediamtx_fetch_1.buildMediaMtxHlsUrl)(hlsBase, file, effectiveQuery);
    const fetchOptions = {
        cookie: (0, hls_cookie_jar_1.getHlsCookie)(token, sessionKey),
        maxWaitMs: HLS_PROXY_MAX_WAIT_MS,
    };
    const isManifest = file.endsWith('.m3u8');
    let response = isManifest
        ? await (0, mediamtx_fetch_1.fetchHlsManifestFromMediaMtx)(hlsUrl, fetchOptions)
        : await (0, mediamtx_fetch_1.fetchFromMediaMtx)(hlsUrl, fetchOptions);
    if (!response.ok && response.status === 401 && isManifest && file !== 'index.m3u8') {
        const indexUrl = (0, mediamtx_fetch_1.buildMediaMtxHlsUrl)(hlsBase, 'index.m3u8', {});
        const indexResponse = await (0, mediamtx_fetch_1.fetchFromMediaMtx)(indexUrl, fetchOptions);
        const bootstrappedCookie = (0, hls_cookie_jar_1.mergeCookieHeader)((0, hls_cookie_jar_1.getHlsCookie)(token, sessionKey), (0, hls_cookie_jar_1.collectSetCookie)(indexResponse));
        if (bootstrappedCookie) {
            (0, hls_cookie_jar_1.setHlsCookie)(token, sessionKey, bootstrappedCookie);
            const retryOptions = { cookie: bootstrappedCookie, maxWaitMs: HLS_PROXY_MAX_WAIT_MS };
            response = isManifest
                ? await (0, mediamtx_fetch_1.fetchHlsManifestFromMediaMtx)(hlsUrl, retryOptions)
                : await (0, mediamtx_fetch_1.fetchFromMediaMtx)(hlsUrl, retryOptions);
        }
    }
    const mergedCookie = (0, hls_cookie_jar_1.mergeCookieHeader)((0, hls_cookie_jar_1.getHlsCookie)(token, sessionKey), (0, hls_cookie_jar_1.collectSetCookie)(response));
    if (mergedCookie) {
        (0, hls_cookie_jar_1.setHlsCookie)(token, sessionKey, mergedCookie);
    }
    return response;
}
function mapHlsFetchError(status) {
    if (status === 404) {
        return new errors_1.AppError(404, 'Stream path not found in MediaMTX. Open the live page to register paths, or re-save the camera in admin.');
    }
    if (status === 401) {
        return new errors_1.AppError(502, 'MediaMTX rejected HLS sub-playlist (401). Run bash deploy/restart-mediamtx.sh and confirm hlsVariant: fmp4 in /opt/mediamtx/mediamtx.yml.');
    }
    return new errors_1.AppError(503, 'HLS manifest not ready from MediaMTX. RTSP may be connected but HLS remux is still starting — retry in a few seconds. If logs show "MPEG-TS supports H264 only", run bash deploy/restart-mediamtx.sh (needs hlsVariant: fmp4 for H265 DVRs).');
}
exports.streamRouter.get('/hls/:token/:file', async (req, res, next) => {
    try {
        const token = (0, params_1.paramString)(req, 'token');
        const payload = playback_service_1.playbackService.verifyToken(token);
        (0, stream_ondemand_service_1.touchSiteActivity)(payload.siteSlug);
        const wildcard = (0, params_1.paramString)(req, 'file') || 'index.m3u8';
        const query = { ...req.query };
        const response = await fetchHlsFromMediaMtx(token, payload.mediamtxPath, wildcard, query);
        if (!response.ok) {
            const detail = await response.clone().text().catch(() => '');
            console.warn(`HLS proxy ${wildcard} for ${payload.mediamtxPath} failed: ${response.status} ${detail.slice(0, 200)}`);
            throw mapHlsFetchError(response.status);
        }
        const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
        let bodyBuffer = Buffer.from(await response.arrayBuffer());
        if (wildcard.endsWith('.m3u8')) {
            const manifest = bodyBuffer.toString('utf8');
            const apiBase = (0, request_base_1.getRequestApiBase)(req);
            const sessionFromQuery = typeof query.session === 'string'
                ? query.session
                : (0, mediamtx_fetch_1.parseSessionFromManifest)(manifest) ??
                    (0, mediamtx_fetch_1.extractMediaMtxHlsSession)(response) ??
                    (0, hls_cookie_jar_1.getPlaybackHlsSession)(token);
            if (wildcard === 'index.m3u8' && sessionFromQuery) {
                (0, hls_cookie_jar_1.rememberPlaybackHlsSession)(token, sessionFromQuery);
            }
            const rewritten = (0, mediamtx_fetch_1.rewriteHlsManifestForProxy)(manifest, apiBase, token, sessionFromQuery);
            bodyBuffer = Buffer.from(rewritten, 'utf8');
        }
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'no-store');
        res.status(response.status).send(bodyBuffer);
    }
    catch (error) {
        next(error);
    }
});
//# sourceMappingURL=stream.routes.js.map