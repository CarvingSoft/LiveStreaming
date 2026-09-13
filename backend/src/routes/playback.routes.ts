import { Router } from 'express';
import { optionalAuthenticate, AuthenticatedRequest } from '../middleware/auth.middleware';
import { validateParams } from '../middleware/validate.middleware';
import { getCameraBySiteAndKey } from '../repositories/camera.repository';
import { getSiteBySlug } from '../repositories/site.repository';
import { playbackService } from '../services/playback.service';
import { AppError } from '../utils/errors';
import { paramString } from '../utils/params';
import { playbackParamSchema } from '../validators/camera.validator';
import { getRequestApiBase } from '../utils/request-base';
import { RESERVED_SLUGS } from '../validators/site.validator';

export const playbackRouter = Router();

async function resolvePlaybackTarget(siteSlug: string, cameraKey: string, req: AuthenticatedRequest) {
  if (RESERVED_SLUGS.has(siteSlug)) {
    throw new AppError(404, 'Site not found');
  }

  const site = await getSiteBySlug(siteSlug);

  if (!site.isActive) {
    throw new AppError(403, 'Site is disabled');
  }

  if (!site.isPublic && !req.user) {
    throw new AppError(401, 'Authentication required for private site');
  }

  const camera = await getCameraBySiteAndKey(site._id, cameraKey);

  if (!camera.isActive) {
    throw new AppError(403, 'Camera is disabled');
  }

  return { site, camera };
}

playbackRouter.get(
  '/:siteSlug/:cameraKey',
  optionalAuthenticate,
  validateParams(playbackParamSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { site, camera } = await resolvePlaybackTarget(
        paramString(req, 'siteSlug'),
        paramString(req, 'cameraKey'),
        req,
      );

      const session = await playbackService.createSession({
        siteSlug: site.slug,
        cameraKey: camera.cameraKey,
        mediamtxPath: camera.mediamtxPath,
        cameraName: camera.name,
        isActive: camera.isActive,
        apiPublicBase: getRequestApiBase(req),
      });

      res.json({
        cameraKey: camera.cameraKey,
        cameraName: camera.name,
        status: session.status,
        whepUrl: session.whepUrl,
        hlsUrl: session.hlsUrl,
        expiresAt: session.expiresAt,
      });
    } catch (error) {
      next(error);
    }
  },
);

playbackRouter.get(
  '/:siteSlug/:cameraKey/token',
  optionalAuthenticate,
  validateParams(playbackParamSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { site, camera } = await resolvePlaybackTarget(
        paramString(req, 'siteSlug'),
        paramString(req, 'cameraKey'),
        req,
      );

      const session = await playbackService.createSession({
        siteSlug: site.slug,
        cameraKey: camera.cameraKey,
        mediamtxPath: camera.mediamtxPath,
        cameraName: camera.name,
        isActive: camera.isActive,
        apiPublicBase: getRequestApiBase(req),
      });

      res.json({
        token: session.token,
        whepUrl: session.whepUrl,
        hlsUrl: session.hlsUrl,
        expiresAt: session.expiresAt,
        status: session.status,
      });
    } catch (error) {
      next(error);
    }
  },
);
