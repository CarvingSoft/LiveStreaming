"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mediaMtxService = exports.MediaMtxService = void 0;
const env_1 = require("../config/env");
class MediaMtxService {
    apiBase = env_1.env.MEDIAMTX_API_URL.replace(/\/$/, '');
    async healthCheck() {
        try {
            const response = await fetch(`${this.apiBase}/v3/paths/list`, {
                signal: AbortSignal.timeout(5000),
            });
            if (!response.ok) {
                return { ok: false, message: `MediaMTX API returned ${response.status}` };
            }
            return { ok: true };
        }
        catch (error) {
            return {
                ok: false,
                message: error instanceof Error ? error.message : 'MediaMTX unreachable',
            };
        }
    }
    async upsertPath(pathName, source) {
        const encodedName = encodeURIComponent(pathName);
        const existing = await this.getPath(pathName);
        const body = JSON.stringify({
            source,
            sourceOnDemand: true,
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
    async deletePath(pathName) {
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
    async getPath(pathName) {
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
        return (await response.json());
    }
    mapPathStatus(pathStatus, isActive) {
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
    getWhepInternalUrl(mediamtxPath) {
        return `${env_1.env.MEDIAMTX_WEBRTC_URL.replace(/\/$/, '')}/${mediamtxPath}/whep`;
    }
    getHlsInternalUrl(mediamtxPath, suffix = 'index.m3u8') {
        const base = env_1.env.MEDIAMTX_HLS_URL.replace(/\/$/, '');
        return `${base}/${mediamtxPath}/${suffix}`;
    }
}
exports.MediaMtxService = MediaMtxService;
exports.mediaMtxService = new MediaMtxService();
//# sourceMappingURL=mediamtx.service.js.map