"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamRouter = void 0;
const express_1 = require("express");
const playback_service_1 = require("../services/playback.service");
const mediamtx_service_1 = require("../services/mediamtx.service");
const errors_1 = require("../utils/errors");
const params_1 = require("../utils/params");
const mediamtx_fetch_1 = require("../utils/mediamtx-fetch");
const request_base_1 = require("../utils/request-base");
exports.streamRouter = (0, express_1.Router)();
exports.streamRouter.options('/whep/:token', (_req, res) => {
    res.status(204).send();
});
exports.streamRouter.post('/whep/:token', async (req, res, next) => {
    try {
        const payload = playback_service_1.playbackService.verifyToken((0, params_1.paramString)(req, 'token'));
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
exports.streamRouter.get('/hls/:token/:file', async (req, res, next) => {
    try {
        const payload = playback_service_1.playbackService.verifyToken((0, params_1.paramString)(req, 'token'));
        const wildcard = (0, params_1.paramString)(req, 'file') || 'index.m3u8';
        const hlsUrl = mediamtx_service_1.mediaMtxService.getHlsInternalUrl(payload.mediamtxPath, wildcard);
        const response = wildcard.endsWith('.m3u8')
            ? await (0, mediamtx_fetch_1.fetchHlsManifestFromMediaMtx)(hlsUrl)
            : await (0, mediamtx_fetch_1.fetchFromMediaMtx)(hlsUrl);
        if (!response.ok) {
            throw new errors_1.AppError(response.status === 404 ? 404 : 502, `Unable to fetch HLS stream (MediaMTX returned ${response.status})`);
        }
        const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
        let bodyBuffer = Buffer.from(await response.arrayBuffer());
        if (wildcard.endsWith('.m3u8')) {
            const manifest = bodyBuffer.toString('utf8');
            const token = (0, params_1.paramString)(req, 'token');
            const rewritten = manifest
                .split('\n')
                .map((line) => {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) {
                    return line;
                }
                const segmentName = trimmed.split('/').pop() ?? trimmed;
                const apiBase = (0, request_base_1.getRequestApiBase)(req);
                return `${apiBase}/api/stream/hls/${token}/${segmentName}`;
            })
                .join('\n');
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