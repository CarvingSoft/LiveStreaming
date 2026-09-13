"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sitesRouter = void 0;
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const camera_model_1 = require("../models/camera.model");
const site_model_1 = require("../models/site.model");
const audit_service_1 = require("../services/audit.service");
const mediamtx_service_1 = require("../services/mediamtx.service");
const sanitize_1 = require("../utils/sanitize");
const site_repository_1 = require("../repositories/site.repository");
const errors_1 = require("../utils/errors");
const params_1 = require("../utils/params");
const site_validator_1 = require("../validators/site.validator");
exports.sitesRouter = (0, express_1.Router)();
exports.sitesRouter.use(auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('super_admin', 'admin'));
exports.sitesRouter.get('/', async (_req, res, next) => {
    try {
        const sites = await site_model_1.Site.find().sort({ createdAt: -1 });
        res.json(sites.map(sanitize_1.sanitizeSite));
    }
    catch (error) {
        next(error);
    }
});
exports.sitesRouter.get('/stats', async (_req, res, next) => {
    try {
        const [totalSites, activeSites, totalCameras, onlineCameras, offlineCameras] = await Promise.all([
            site_model_1.Site.countDocuments(),
            site_model_1.Site.countDocuments({ isActive: true }),
            camera_model_1.Camera.countDocuments(),
            camera_model_1.Camera.countDocuments({ isActive: true, lastKnownStatus: 'online' }),
            camera_model_1.Camera.countDocuments({ isActive: true, lastKnownStatus: { $in: ['offline', 'error'] } }),
        ]);
        res.json({ totalSites, activeSites, totalCameras, onlineCameras, offlineCameras });
    }
    catch (error) {
        next(error);
    }
});
exports.sitesRouter.get('/:id', (0, validate_middleware_1.validateParams)(site_validator_1.siteIdParamSchema), async (req, res, next) => {
    try {
        const site = await (0, site_repository_1.getSiteById)((0, params_1.paramString)(req, 'id'));
        res.json((0, sanitize_1.sanitizeSite)(site));
    }
    catch (error) {
        next(error);
    }
});
exports.sitesRouter.post('/', (0, validate_middleware_1.validateBody)(site_validator_1.siteCreateSchema), async (req, res, next) => {
    try {
        const { slug } = req.body;
        if (site_validator_1.RESERVED_SLUGS.has(slug)) {
            throw new errors_1.AppError(400, 'Slug is reserved');
        }
        const existing = await site_model_1.Site.findOne({ slug });
        if (existing) {
            throw new errors_1.AppError(409, 'Site slug already exists');
        }
        const site = await site_model_1.Site.create(req.body);
        await (0, audit_service_1.writeAuditLog)({
            userId: req.user.id,
            action: 'site.create',
            entityType: 'Site',
            entityId: String(site._id),
            metadata: { slug: site.slug, name: site.name },
            ip: req.ip,
        });
        res.status(201).json((0, sanitize_1.sanitizeSite)(site));
    }
    catch (error) {
        next(error);
    }
});
exports.sitesRouter.put('/:id', (0, validate_middleware_1.validateParams)(site_validator_1.siteIdParamSchema), (0, validate_middleware_1.validateBody)(site_validator_1.siteUpdateSchema), async (req, res, next) => {
    try {
        const site = await (0, site_repository_1.getSiteById)((0, params_1.paramString)(req, 'id'));
        if (req.body.slug && site_validator_1.RESERVED_SLUGS.has(req.body.slug)) {
            throw new errors_1.AppError(400, 'Slug is reserved');
        }
        if (req.body.slug && req.body.slug !== site.slug) {
            const duplicate = await site_model_1.Site.findOne({ slug: req.body.slug });
            if (duplicate) {
                throw new errors_1.AppError(409, 'Site slug already exists');
            }
        }
        Object.assign(site, req.body);
        await site.save();
        await (0, audit_service_1.writeAuditLog)({
            userId: req.user.id,
            action: 'site.update',
            entityType: 'Site',
            entityId: String(site._id),
            metadata: { slug: site.slug },
            ip: req.ip,
        });
        res.json((0, sanitize_1.sanitizeSite)(site));
    }
    catch (error) {
        next(error);
    }
});
exports.sitesRouter.delete('/:id', (0, validate_middleware_1.validateParams)(site_validator_1.siteIdParamSchema), async (req, res, next) => {
    try {
        const site = await (0, site_repository_1.getSiteById)((0, params_1.paramString)(req, 'id'));
        const cameras = await camera_model_1.Camera.find({ siteId: site._id });
        for (const camera of cameras) {
            try {
                await mediamtx_service_1.mediaMtxService.deletePath(camera.mediamtxPath);
            }
            catch {
                // Continue cleanup even if MediaMTX path removal fails.
            }
        }
        await camera_model_1.Camera.deleteMany({ siteId: site._id });
        await site.deleteOne();
        await (0, audit_service_1.writeAuditLog)({
            userId: req.user.id,
            action: 'site.delete',
            entityType: 'Site',
            entityId: String(site._id),
            metadata: { slug: site.slug },
            ip: req.ip,
        });
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
});
//# sourceMappingURL=sites.routes.js.map