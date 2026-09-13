"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.playbackRouter = void 0;
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const camera_repository_1 = require("../repositories/camera.repository");
const site_repository_1 = require("../repositories/site.repository");
const playback_service_1 = require("../services/playback.service");
const errors_1 = require("../utils/errors");
const params_1 = require("../utils/params");
const camera_validator_1 = require("../validators/camera.validator");
const request_base_1 = require("../utils/request-base");
const site_validator_1 = require("../validators/site.validator");
exports.playbackRouter = (0, express_1.Router)();
async function resolvePlaybackTarget(siteSlug, cameraKey, req) {
    if (site_validator_1.RESERVED_SLUGS.has(siteSlug)) {
        throw new errors_1.AppError(404, 'Site not found');
    }
    const site = await (0, site_repository_1.getSiteBySlug)(siteSlug);
    if (!site.isActive) {
        throw new errors_1.AppError(403, 'Site is disabled');
    }
    if (!site.isPublic && !req.user) {
        throw new errors_1.AppError(401, 'Authentication required for private site');
    }
    const camera = await (0, camera_repository_1.getCameraBySiteAndKey)(site._id, cameraKey);
    if (!camera.isActive) {
        throw new errors_1.AppError(403, 'Camera is disabled');
    }
    return { site, camera };
}
exports.playbackRouter.get('/:siteSlug/:cameraKey', auth_middleware_1.optionalAuthenticate, (0, validate_middleware_1.validateParams)(camera_validator_1.playbackParamSchema), async (req, res, next) => {
    try {
        const { site, camera } = await resolvePlaybackTarget((0, params_1.paramString)(req, 'siteSlug'), (0, params_1.paramString)(req, 'cameraKey'), req);
        const session = await playback_service_1.playbackService.createSession({
            siteSlug: site.slug,
            cameraKey: camera.cameraKey,
            mediamtxPath: camera.mediamtxPath,
            cameraName: camera.name,
            isActive: camera.isActive,
            apiPublicBase: (0, request_base_1.getRequestApiBase)(req),
        });
        res.json({
            cameraKey: camera.cameraKey,
            cameraName: camera.name,
            status: session.status,
            whepUrl: session.whepUrl,
            hlsUrl: session.hlsUrl,
            expiresAt: session.expiresAt,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.playbackRouter.get('/:siteSlug/:cameraKey/token', auth_middleware_1.optionalAuthenticate, (0, validate_middleware_1.validateParams)(camera_validator_1.playbackParamSchema), async (req, res, next) => {
    try {
        const { site, camera } = await resolvePlaybackTarget((0, params_1.paramString)(req, 'siteSlug'), (0, params_1.paramString)(req, 'cameraKey'), req);
        const session = await playback_service_1.playbackService.createSession({
            siteSlug: site.slug,
            cameraKey: camera.cameraKey,
            mediamtxPath: camera.mediamtxPath,
            cameraName: camera.name,
            isActive: camera.isActive,
            apiPublicBase: (0, request_base_1.getRequestApiBase)(req),
        });
        res.json({
            token: session.token,
            whepUrl: session.whepUrl,
            hlsUrl: session.hlsUrl,
            expiresAt: session.expiresAt,
            status: session.status,
        });
    }
    catch (error) {
        next(error);
    }
});
//# sourceMappingURL=playback.routes.js.map