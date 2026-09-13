"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicRouter = void 0;
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const camera_model_1 = require("../models/camera.model");
const site_repository_1 = require("../repositories/site.repository");
const sanitize_1 = require("../utils/sanitize");
const errors_1 = require("../utils/errors");
const params_1 = require("../utils/params");
const site_validator_1 = require("../validators/site.validator");
exports.publicRouter = (0, express_1.Router)();
exports.publicRouter.get('/sites/:slug', auth_middleware_1.optionalAuthenticate, (0, validate_middleware_1.validateParams)(site_validator_1.siteSlugParamSchema), async (req, res, next) => {
    try {
        const slug = (0, params_1.paramString)(req, 'slug');
        if (site_validator_1.RESERVED_SLUGS.has(slug)) {
            throw new errors_1.AppError(404, 'Site not found');
        }
        const site = await (0, site_repository_1.getSiteBySlug)(slug);
        if (!site.isActive) {
            throw new errors_1.AppError(403, 'Site is disabled');
        }
        if (!site.isPublic && !req.user) {
            throw new errors_1.AppError(401, 'Authentication required for private site');
        }
        const cameras = await camera_model_1.Camera.find({ siteId: site._id, isActive: true }).sort({
            sortOrder: 1,
            createdAt: 1,
        });
        res.json({
            site: (0, sanitize_1.sanitizeSite)(site),
            cameras: cameras.map(sanitize_1.sanitizePublicCamera),
        });
    }
    catch (error) {
        next(error);
    }
});
//# sourceMappingURL=public.routes.js.map