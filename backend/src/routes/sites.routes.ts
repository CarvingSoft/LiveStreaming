import { Router } from 'express';
import { authenticate, AuthenticatedRequest, authorize } from '../middleware/auth.middleware';
import { validateBody, validateParams } from '../middleware/validate.middleware';
import { Camera } from '../models/camera.model';
import { Site } from '../models/site.model';
import { writeAuditLog } from '../services/audit.service';
import { mediaMtxService } from '../services/mediamtx.service';
import { sanitizeSite } from '../utils/sanitize';
import { getSiteById } from '../repositories/site.repository';
import { AppError } from '../utils/errors';
import { paramString } from '../utils/params';
import {
  RESERVED_SLUGS,
  siteCreateSchema,
  siteIdParamSchema,
  siteUpdateSchema,
} from '../validators/site.validator';

export const sitesRouter = Router();

sitesRouter.use(authenticate, authorize('super_admin', 'admin'));

sitesRouter.get('/', async (_req, res, next) => {
  try {
    const sites = await Site.find().sort({ createdAt: -1 });
    res.json(sites.map(sanitizeSite));
  } catch (error) {
    next(error);
  }
});

sitesRouter.get('/stats', async (_req, res, next) => {
  try {
    const [totalSites, activeSites, totalCameras, onlineCameras, offlineCameras] = await Promise.all([
      Site.countDocuments(),
      Site.countDocuments({ isActive: true }),
      Camera.countDocuments(),
      Camera.countDocuments({ isActive: true, lastKnownStatus: 'online' }),
      Camera.countDocuments({ isActive: true, lastKnownStatus: { $in: ['offline', 'error'] } }),
    ]);

    res.json({ totalSites, activeSites, totalCameras, onlineCameras, offlineCameras });
  } catch (error) {
    next(error);
  }
});

sitesRouter.get('/:id', validateParams(siteIdParamSchema), async (req, res, next) => {
  try {
    const site = await getSiteById(paramString(req, 'id'));
    res.json(sanitizeSite(site));
  } catch (error) {
    next(error);
  }
});

sitesRouter.post('/', validateBody(siteCreateSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { slug } = req.body as { slug: string };
    if (RESERVED_SLUGS.has(slug)) {
      throw new AppError(400, 'Slug is reserved');
    }

    const existing = await Site.findOne({ slug });
    if (existing) {
      throw new AppError(409, 'Site slug already exists');
    }

    const site = await Site.create(req.body);
    await writeAuditLog({
      userId: req.user!.id,
      action: 'site.create',
      entityType: 'Site',
      entityId: String(site._id),
      metadata: { slug: site.slug, name: site.name },
      ip: req.ip,
    });

    res.status(201).json(sanitizeSite(site));
  } catch (error) {
    next(error);
  }
});

sitesRouter.put(
  '/:id',
  validateParams(siteIdParamSchema),
  validateBody(siteUpdateSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const site = await getSiteById(paramString(req, 'id'));

      if (req.body.slug && RESERVED_SLUGS.has(req.body.slug)) {
        throw new AppError(400, 'Slug is reserved');
      }

      if (req.body.slug && req.body.slug !== site.slug) {
        const duplicate = await Site.findOne({ slug: req.body.slug });
        if (duplicate) {
          throw new AppError(409, 'Site slug already exists');
        }
      }

      Object.assign(site, req.body);
      await site.save();

      await writeAuditLog({
        userId: req.user!.id,
        action: 'site.update',
        entityType: 'Site',
        entityId: String(site._id),
        metadata: { slug: site.slug },
        ip: req.ip,
      });

      res.json(sanitizeSite(site));
    } catch (error) {
      next(error);
    }
  },
);

sitesRouter.delete(
  '/:id',
  validateParams(siteIdParamSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const site = await getSiteById(paramString(req, 'id'));
      const cameras = await Camera.find({ siteId: site._id });

      for (const camera of cameras) {
        try {
          await mediaMtxService.deletePath(camera.mediamtxPath);
        } catch {
          // Continue cleanup even if MediaMTX path removal fails.
        }
      }

      await Camera.deleteMany({ siteId: site._id });
      await site.deleteOne();

      await writeAuditLog({
        userId: req.user!.id,
        action: 'site.delete',
        entityType: 'Site',
        entityId: String(site._id),
        metadata: { slug: site.slug },
        ip: req.ip,
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);
