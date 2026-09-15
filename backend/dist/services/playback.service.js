"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.playbackService = exports.PlaybackService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const mediamtx_fetch_1 = require("../utils/mediamtx-fetch");
const mediamtx_service_1 = require("./mediamtx.service");
const stream_ondemand_service_1 = require("./stream-ondemand.service");
class PlaybackService {
    issueToken(payload) {
        const expiresAt = new Date(Date.now() + env_1.env.PLAYBACK_TOKEN_TTL_SECONDS * 1000);
        const token = jsonwebtoken_1.default.sign({
            ...payload,
            type: 'playback',
        }, env_1.env.PLAYBACK_JWT_SECRET, { expiresIn: env_1.env.PLAYBACK_TOKEN_TTL_SECONDS });
        return { token, expiresAt };
    }
    verifyToken(token) {
        const decoded = jsonwebtoken_1.default.verify(token, env_1.env.PLAYBACK_JWT_SECRET);
        if (decoded.type !== 'playback') {
            throw new Error('Invalid playback token type');
        }
        return decoded;
    }
    buildPublicUrls(token, apiPublicBase) {
        const apiBase = (apiPublicBase ?? env_1.env.API_PUBLIC_URL).replace(/\/$/, '');
        return {
            whepUrl: `${apiBase}/api/stream/whep/${token}`,
            hlsUrl: `${apiBase}/api/stream/hls/${token}/index.m3u8`,
        };
    }
    async warmUpHlsPath(mediamtxPath) {
        const hlsUrl = mediamtx_service_1.mediaMtxService.getHlsInternalUrl(mediamtxPath, 'index.m3u8');
        const maxWaitMs = env_1.env.STREAM_ON_DEMAND ? 45_000 : 20_000;
        try {
            const response = await (0, mediamtx_fetch_1.fetchHlsManifestFromMediaMtx)(hlsUrl, { maxWaitMs });
            if (!response.ok) {
                console.warn(`HLS warm-up for ${mediamtxPath} returned ${response.status}`);
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'unknown error';
            console.warn(`HLS warm-up for ${mediamtxPath} failed: ${message}`);
        }
    }
    async createSession(input) {
        await (0, stream_ondemand_service_1.ensureSiteStreaming)(input.siteSlug, {
            sourceType: input.sourceType,
            encryptedSourceConfig: input.encryptedSourceConfig,
            mediamtxPath: input.mediamtxPath,
            isActive: input.isActive,
        });
        (0, stream_ondemand_service_1.touchSiteActivity)(input.siteSlug);
        if (input.isActive) {
            // Non-blocking — warm-up must not delay the playback API (nginx/browser timeouts).
            void this.warmUpHlsPath(input.mediamtxPath);
        }
        const pathStatus = await mediamtx_service_1.mediaMtxService.getPath(input.mediamtxPath);
        const status = mediamtx_service_1.mediaMtxService.mapPathStatus(pathStatus, input.isActive);
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
exports.PlaybackService = PlaybackService;
exports.playbackService = new PlaybackService();
//# sourceMappingURL=playback.service.js.map