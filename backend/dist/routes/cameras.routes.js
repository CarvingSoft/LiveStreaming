"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.camerasRouter = void 0;
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const camera_model_1 = require("../models/camera.model");
const site_repository_1 = require("../repositories/site.repository");
const camera_repository_1 = require("../repositories/camera.repository");
const audit_service_1 = require("../services/audit.service");
const encryption_service_1 = require("../services/encryption.service");
const mediamtx_service_1 = require("../services/mediamtx.service");
const mediamtx_sync_service_1 = require("../services/mediamtx-sync.service");
const rtsp_builder_service_1 = require("../services/rtsp-builder.service");
const sanitize_1 = require("../utils/sanitize");
const errors_1 = require("../utils/errors");
const params_1 = require("../utils/params");
const camera_validator_1 = require("../validators/camera.validator");
const site_validator_1 = require("../validators/site.validator");
const encryption_service_2 = require("../services/encryption.service");
const rtsp_config_1 = require("../utils/rtsp-config");
exports.camerasRouter = (0, express_1.Router)();
exports.camerasRouter.use(auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('super_admin', 'admin'));
function mapEncryptionError(error) {
    const message = error instanceof Error ? error.message : 'Encryption failed';
    if (message.includes('ENCRYPTION_KEY')) {
        return new errors_1.AppError(503, 'Server ENCRYPTION_KEY is invalid. Set a base64-encoded 32-byte key in backend/.env (openssl rand -base64 32).');
    }
    return new errors_1.AppError(500, message);
}
function mapMediaMtxSyncError(error) {
    if (error instanceof errors_1.AppError) {
        return error;
    }
    const message = error instanceof Error ? error.message : 'MediaMTX sync failed';
    if (message.includes('fetch failed') || message.includes('ECONNREFUSED')) {
        return new errors_1.AppError(503, 'MediaMTX is not reachable. Ensure the MediaMTX service is running.');
    }
    if (message.includes('cannot be decrypted') || message.includes('source configuration is required')) {
        return new errors_1.AppError(400, message);
    }
    return new errors_1.AppError(502, `Failed to sync camera stream with MediaMTX: ${message}`);
}
exports.camerasRouter.get('/sites/:id/cameras', (0, validate_middleware_1.validateParams)(site_validator_1.siteIdParamSchema), async (req, res, next) => {
    try {
        const site = await (0, site_repository_1.getSiteById)((0, params_1.paramString)(req, 'id'));
        const cameras = await camera_model_1.Camera.find({ siteId: site._id }).sort({ sortOrder: 1, createdAt: 1 });
        // List view does not need RTSP credentials — avoid decrypt failures breaking the page
        res.json(cameras.map(sanitize_1.sanitizeCamera));
    }
    catch (error) {
        next(error);
    }
});
exports.camerasRouter.post('/sites/:id/cameras', (0, validate_middleware_1.validateParams)(site_validator_1.siteIdParamSchema), (0, validate_middleware_1.validateBody)(camera_validator_1.cameraCreateSchema), async (req, res, next) => {
    try {
        const site = await (0, site_repository_1.getSiteById)((0, params_1.paramString)(req, 'id'));
        const body = req.body;
        const cameraKey = body.cameraKey ? (0, rtsp_builder_service_1.slugifyCameraKey)(body.cameraKey) : (0, rtsp_builder_service_1.slugifyCameraKey)(body.name);
        if (!cameraKey) {
            throw new errors_1.AppError(400, 'Invalid camera key');
        }
        const duplicate = await camera_model_1.Camera.findOne({ siteId: site._id, cameraKey });
        if (duplicate) {
            throw new errors_1.AppError(409, 'Camera key already exists on this site');
        }
        if (body.sourceType === 'rtsp' && !body.sourceConfig?.password) {
            throw new errors_1.AppError(400, 'RTSP password is required when creating a camera');
        }
        if (body.sourceType === 'rtsp' && body.sourceConfig) {
            (0, rtsp_config_1.assertPublicRtspHost)(body.sourceConfig);
        }
        const mediamtxPath = (0, rtsp_builder_service_1.buildMediamtxPath)(site.slug, cameraKey);
        let encryptedSourceConfig;
        if (body.sourceConfig) {
            try {
                encryptedSourceConfig = (0, encryption_service_1.encryptJson)(body.sourceConfig);
            }
            catch (error) {
                throw mapEncryptionError(error);
            }
        }
        const camera = await camera_model_1.Camera.create({
            siteId: site._id,
            name: body.name,
            cameraKey,
            channelNumber: body.channelNumber ?? body.sourceConfig?.channel,
            sourceType: body.sourceType,
            encryptedSourceConfig,
            mediamtxPath,
            isActive: body.isActive ?? true,
            sortOrder: body.sortOrder ?? 0,
            lastKnownStatus: body.isActive === false ? 'disabled' : 'offline',
        });
        try {
            await (0, mediamtx_sync_service_1.syncCameraToMediaMtx)(camera);
        }
        catch (error) {
            await camera.deleteOne();
            throw mapMediaMtxSyncError(error);
        }
        await (0, audit_service_1.writeAuditLog)({
            userId: req.user.id,
            action: 'camera.create',
            entityType: 'Camera',
            entityId: String(camera._id),
            metadata: { siteSlug: site.slug, cameraKey: camera.cameraKey },
            ip: req.ip,
        });
        res.status(201).json((0, sanitize_1.sanitizeCamera)(camera));
    }
    catch (error) {
        next(error);
    }
});
exports.camerasRouter.get('/:id', (0, validate_middleware_1.validateParams)(camera_validator_1.cameraIdParamSchema), async (req, res, next) => {
    try {
        const camera = await (0, camera_repository_1.getCameraById)((0, params_1.paramString)(req, 'id'));
        await (0, site_repository_1.getSiteById)(String(camera.siteId));
        res.json((0, sanitize_1.sanitizeCameraAdmin)(camera));
    }
    catch (error) {
        next(error);
    }
});
exports.camerasRouter.put('/:id', (0, validate_middleware_1.validateParams)(camera_validator_1.cameraIdParamSchema), (0, validate_middleware_1.validateBody)(camera_validator_1.cameraUpdateSchema), async (req, res, next) => {
    try {
        const camera = await (0, camera_repository_1.getCameraById)((0, params_1.paramString)(req, 'id'));
        const site = await (0, site_repository_1.getSiteById)(String(camera.siteId));
        const body = req.body;
        if (body.cameraKey && (0, rtsp_builder_service_1.slugifyCameraKey)(body.cameraKey) !== camera.cameraKey) {
            throw new errors_1.AppError(400, 'Camera key cannot be changed after creation');
        }
        if (body.name)
            camera.name = body.name;
        if (body.channelNumber !== undefined)
            camera.channelNumber = body.channelNumber;
        if (body.sourceType)
            camera.sourceType = body.sourceType;
        if (body.isActive !== undefined)
            camera.isActive = body.isActive;
        if (body.sortOrder !== undefined)
            camera.sortOrder = body.sortOrder;
        if (body.sourceConfig) {
            let existingConfig;
            if (camera.encryptedSourceConfig) {
                try {
                    existingConfig = (0, encryption_service_2.decryptJson)(camera.encryptedSourceConfig);
                }
                catch {
                    throw new errors_1.AppError(400, 'Stored camera credentials cannot be decrypted. Re-enter the RTSP password and save again.');
                }
            }
            else {
                existingConfig = {
                    host: '',
                    port: 554,
                    username: '',
                    password: '',
                    channel: 1,
                    subtype: 0,
                };
            }
            const pick = (value, fallback) => {
                if (value === undefined || value === null)
                    return fallback;
                if (typeof value === 'string' && value.trim() === '')
                    return fallback;
                return value;
            };
            const merged = {
                host: pick(body.sourceConfig.host, existingConfig.host),
                port: body.sourceConfig.port ?? existingConfig.port,
                username: pick(body.sourceConfig.username, existingConfig.username),
                password: pick(body.sourceConfig.password, existingConfig.password),
                channel: body.sourceConfig.channel ?? existingConfig.channel,
                subtype: body.sourceConfig.subtype ?? existingConfig.subtype,
                customPath: pick(body.sourceConfig.customPath, existingConfig.customPath),
            };
            if (camera.sourceType === 'rtsp' && !merged.password) {
                throw new errors_1.AppError(400, 'RTSP password is required');
            }
            if (camera.sourceType === 'rtsp') {
                (0, rtsp_config_1.assertPublicRtspHost)(merged);
            }
            try {
                camera.encryptedSourceConfig = (0, encryption_service_1.encryptJson)(merged);
            }
            catch (error) {
                throw mapEncryptionError(error);
            }
            camera.channelNumber = merged.channel;
        }
        if (!camera.isActive) {
            camera.lastKnownStatus = 'disabled';
        }
        await camera.save();
        try {
            await (0, mediamtx_sync_service_1.syncCameraToMediaMtx)(camera);
        }
        catch (error) {
            throw mapMediaMtxSyncError(error);
        }
        await (0, audit_service_1.writeAuditLog)({
            userId: req.user.id,
            action: 'camera.update',
            entityType: 'Camera',
            entityId: String(camera._id),
            metadata: { siteSlug: site.slug, cameraKey: camera.cameraKey },
            ip: req.ip,
        });
        res.json((0, sanitize_1.sanitizeCameraAdmin)(camera));
    }
    catch (error) {
        next(error);
    }
});
exports.camerasRouter.delete('/:id', (0, validate_middleware_1.validateParams)(camera_validator_1.cameraIdParamSchema), async (req, res, next) => {
    try {
        const camera = await (0, camera_repository_1.getCameraById)((0, params_1.paramString)(req, 'id'));
        try {
            await mediamtx_service_1.mediaMtxService.deletePath(camera.mediamtxPath);
        }
        catch {
            // Continue deletion even if MediaMTX cleanup fails.
        }
        await camera.deleteOne();
        await (0, audit_service_1.writeAuditLog)({
            userId: req.user.id,
            action: 'camera.delete',
            entityType: 'Camera',
            entityId: String(camera._id),
            metadata: { cameraKey: camera.cameraKey },
            ip: req.ip,
        });
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
});
//# sourceMappingURL=cameras.routes.js.map