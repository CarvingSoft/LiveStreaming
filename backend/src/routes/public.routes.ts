import { Router } from 'express';
import { optionalAuthenticate, AuthenticatedRequest } from '../middleware/auth.middleware';
import { validateParams } from '../middleware/validate.middleware';
import { Camera } from '../models/camera.model';
import { getSiteBySlug } from '../repositories/site.repository';
import { sanitizePublicCamera, sanitizeSite } from '../utils/sanitize';
import { AppError } from '../utils/errors';
import { paramString } from '../utils/params';
import { RESERVED_SLUGS, siteSlugParamSchema } from '../validators/site.validator';

export const publicRouter = Router();

publicRouter.get(
  '/sites/:slug',
  optionalAuthenticate,
  validateParams(siteSlugParamSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const slug = paramString(req, 'slug');

      if (RESERVED_SLUGS.has(slug)) {
        throw new AppError(404, 'Site not found');
      }

      const site = await getSiteBySlug(slug);

      if (!site.isActive) {
        throw new AppError(403, 'Site is disabled');
      }

      if (!site.isPublic && !req.user) {
        throw new AppError(401, 'Authentication required for private site');
      }

      const cameras = await Camera.find({ siteId: site._id, isActive: true }).sort({
        sortOrder: 1,
        createdAt: 1,
      });

      res.json({
        site: sanitizeSite(site),
        cameras: cameras.map(sanitizePublicCamera),
      });
    } catch (error) {
      next(error);
    }
  },
);
