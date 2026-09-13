"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeCamera = sanitizeCamera;
exports.sanitizeCameraAdmin = sanitizeCameraAdmin;
exports.sanitizePublicCamera = sanitizePublicCamera;
exports.sanitizeSite = sanitizeSite;
const encryption_service_1 = require("../services/encryption.service");
function sanitizeRtspSourceConfigForAdmin(encryptedSourceConfig) {
    if (!encryptedSourceConfig) {
        return undefined;
    }
    try {
        const config = (0, encryption_service_1.decryptJson)(encryptedSourceConfig);
        return {
            host: config.host,
            port: config.port,
            username: config.username,
            channel: config.channel,
            subtype: config.subtype,
            customPath: config.customPath,
        };
    }
    catch {
        // Wrong ENCRYPTION_KEY or corrupted payload — do not fail the whole request
        return { credentialsUnavailable: true };
    }
}
function sanitizeCamera(camera) {
    return {
        id: String(camera._id),
        siteId: String(camera.siteId),
        name: camera.name,
        cameraKey: camera.cameraKey,
        channelNumber: camera.channelNumber,
        sourceType: camera.sourceType,
        mediamtxPath: undefined,
        isActive: camera.isActive,
        sortOrder: camera.sortOrder,
        lastKnownStatus: camera.lastKnownStatus,
        lastStatusAt: camera.lastStatusAt,
        hasPassword: Boolean(camera.encryptedSourceConfig),
        createdAt: camera.createdAt,
        updatedAt: camera.updatedAt,
    };
}
function sanitizeCameraAdmin(camera) {
    return {
        ...sanitizeCamera(camera),
        sourceConfig: sanitizeRtspSourceConfigForAdmin(camera.encryptedSourceConfig),
    };
}
function sanitizePublicCamera(camera) {
    return {
        id: String(camera._id),
        name: camera.name,
        cameraKey: camera.cameraKey,
        isActive: camera.isActive,
        sortOrder: camera.sortOrder,
        status: camera.lastKnownStatus,
    };
}
function sanitizeSite(site) {
    return {
        id: String(site._id),
        name: site.name,
        slug: site.slug,
        description: site.description,
        organizationName: site.organizationName,
        location: site.location,
        isActive: site.isActive,
        isPublic: site.isPublic,
        createdAt: site.createdAt,
        updatedAt: site.updatedAt,
    };
}
//# sourceMappingURL=sanitize.js.map