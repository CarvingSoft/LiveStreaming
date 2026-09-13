"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRtspUrl = buildRtspUrl;
exports.buildMediamtxPath = buildMediamtxPath;
exports.slugifyCameraKey = slugifyCameraKey;
const env_1 = require("../config/env");
function encodeCredential(value) {
    return encodeURIComponent(value);
}
function buildRtspUrl(config) {
    const path = config.customPath?.trim()
        ? config.customPath.trim()
        : env_1.env.RTSP_DEFAULT_PATH_TEMPLATE.replace('{channel}', String(config.channel)).replace('{subtype}', String(config.subtype));
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const username = encodeCredential(config.username);
    const password = encodeCredential(config.password);
    return `rtsp://${username}:${password}@${config.host}:${config.port}${normalizedPath}`;
}
function buildMediamtxPath(siteSlug, cameraKey) {
    return `site-${siteSlug}-${cameraKey}`;
}
function slugifyCameraKey(value) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 64);
}
//# sourceMappingURL=rtsp-builder.service.js.map