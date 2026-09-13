import { Router } from 'express';
import { authenticate, AuthenticatedRequest, authorize } from '../middleware/auth.middleware';
import { validateBody, validateParams } from '../middleware/validate.middleware';
import { Camera } from '../models/camera.model';
import { getSiteById } from '../repositories/site.repository';
import { getCameraById } from '../repositories/camera.repository';
import { writeAuditLog } from '../services/audit.service';
import { encryptJson } from '../services/encryption.service';
import { mediaMtxService } from '../services/mediamtx.service';
import { syncCameraToMediaMtx } from '../services/mediamtx-sync.service';
import { buildMediamtxPath, slugifyCameraKey } from '../services/rtsp-builder.service';
import { RtspSourceConfig } from '../types';
import { sanitizeCamera, sanitizeCameraAdmin } from '../utils/sanitize';
import { AppError } from '../utils/errors';
import { paramString } from '../utils/params';
import {
  cameraCreateSchema,
  cameraIdParamSchema,
  cameraUpdateSchema,
} from '../validators/camera.validator';
import { siteIdParamSchema } from '../validators/site.validator';
import { decryptJson } from '../services/encryption.service';

export const camerasRouter = Router();

camerasRouter.use(authenticate, authorize('super_admin', 'admin'));

function mapEncryptionError(error: unknown): AppError {
  const message = error instanceof Error ? error.message : 'Encryption failed';
  if (message.includes('ENCRYPTION_KEY')) {
    return new AppError(
      503,
      'Server ENCRYPTION_KEY is invalid. Set a base64-encoded 32-byte key in backend/.env (openssl rand -base64 32).',
    );
  }
  return new AppError(500, message);
}

function mapMediaMtxSyncError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  const message = error instanceof Error ? error.message : 'MediaMTX sync failed';
  if (message.includes('fetch failed') || message.includes('ECONNREFUSED')) {
    return new AppError(503, 'MediaMTX is not reachable. Ensure the MediaMTX service is running.');
  }
  if (message.includes('cannot be decrypted') || message.includes('source configuration is required')) {
    return new AppError(400, message);
  }

  return new AppError(502, `Failed to sync camera stream with MediaMTX: ${message}`);
}

camerasRouter.get(
  '/sites/:id/cameras',
  validateParams(siteIdParamSchema),
  async (req, res, next) => {
    try {
      const site = await getSiteById(paramString(req, 'id'));
      const cameras = await Camera.find({ siteId: site._id }).sort({ sortOrder: 1, createdAt: 1 });
      // List view does not need RTSP credentials — avoid decrypt failures breaking the page
      res.json(cameras.map(sanitizeCamera));
    } catch (error) {
      next(error);
    }
  },
);

camerasRouter.post(
  '/sites/:id/cameras',
  validateParams(siteIdParamSchema),
  validateBody(cameraCreateSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const site = await getSiteById(paramString(req, 'id'));
      const body = req.body as {
        name: string;
        cameraKey?: string;
        channelNumber?: number;
        sourceType: 'rtsp' | 'connector' | 'vpn';
        sourceConfig?: RtspSourceConfig;
        isActive?: boolean;
        sortOrder?: number;
      };

      const cameraKey = body.cameraKey ? slugifyCameraKey(body.cameraKey) : slugifyCameraKey(body.name);
      if (!cameraKey) {
        throw new AppError(400, 'Invalid camera key');
      }

      const duplicate = await Camera.findOne({ siteId: site._id, cameraKey });
      if (duplicate) {
        throw new AppError(409, 'Camera key already exists on this site');
      }

      if (body.sourceType === 'rtsp' && !body.sourceConfig?.password) {
        throw new AppError(400, 'RTSP password is required when creating a camera');
      }

      const mediamtxPath = buildMediamtxPath(site.slug, cameraKey);
      let encryptedSourceConfig: string | undefined;
      if (body.sourceConfig) {
        try {
          encryptedSourceConfig = encryptJson(body.sourceConfig);
        } catch (error) {
          throw mapEncryptionError(error);
        }
      }

      const camera = await Camera.create({
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
        await syncCameraToMediaMtx(camera);
      } catch (error) {
        await camera.deleteOne();
        throw mapMediaMtxSyncError(error);
      }

      await writeAuditLog({
        userId: req.user!.id,
        action: 'camera.create',
        entityType: 'Camera',
        entityId: String(camera._id),
        metadata: { siteSlug: site.slug, cameraKey: camera.cameraKey },
        ip: req.ip,
      });

      res.status(201).json(sanitizeCamera(camera));
    } catch (error) {
      next(error);
    }
  },
);

camerasRouter.get(
  '/:id',
  validateParams(cameraIdParamSchema),
  async (req, res, next) => {
    try {
      const camera = await getCameraById(paramString(req, 'id'));
      await getSiteById(String(camera.siteId));
      res.json(sanitizeCameraAdmin(camera));
    } catch (error) {
      next(error);
    }
  },
);

camerasRouter.put(
  '/:id',
  validateParams(cameraIdParamSchema),
  validateBody(cameraUpdateSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const camera = await getCameraById(paramString(req, 'id'));
      const site = await getSiteById(String(camera.siteId));
      const body = req.body as {
        name?: string;
        cameraKey?: string;
        channelNumber?: number;
        sourceType?: 'rtsp' | 'connector' | 'vpn';
        sourceConfig?: Partial<RtspSourceConfig>;
        isActive?: boolean;
        sortOrder?: number;
      };

      if (body.cameraKey && slugifyCameraKey(body.cameraKey) !== camera.cameraKey) {
        throw new AppError(400, 'Camera key cannot be changed after creation');
      }

      if (body.name) camera.name = body.name;
      if (body.channelNumber !== undefined) camera.channelNumber = body.channelNumber;
      if (body.sourceType) camera.sourceType = body.sourceType;
      if (body.isActive !== undefined) camera.isActive = body.isActive;
      if (body.sortOrder !== undefined) camera.sortOrder = body.sortOrder;

      if (body.sourceConfig) {
        let existingConfig: RtspSourceConfig;
        if (camera.encryptedSourceConfig) {
          try {
            existingConfig = decryptJson<RtspSourceConfig>(camera.encryptedSourceConfig);
          } catch {
            throw new AppError(
              400,
              'Stored camera credentials cannot be decrypted. Re-enter the RTSP password and save again.',
            );
          }
        } else {
          existingConfig = {
            host: '',
            port: 554,
            username: '',
            password: '',
            channel: 1,
            subtype: 0 as const,
          };
        }

        const pick = <T>(value: T | undefined, fallback: T): T => {
          if (value === undefined || value === null) return fallback;
          if (typeof value === 'string' && value.trim() === '') return fallback;
          return value;
        };

        const merged: RtspSourceConfig = {
          host: pick(body.sourceConfig.host, existingConfig.host),
          port: body.sourceConfig.port ?? existingConfig.port,
          username: pick(body.sourceConfig.username, existingConfig.username),
          password: pick(body.sourceConfig.password, existingConfig.password),
          channel: body.sourceConfig.channel ?? existingConfig.channel,
          subtype: body.sourceConfig.subtype ?? existingConfig.subtype,
          customPath: pick(body.sourceConfig.customPath, existingConfig.customPath),
        };

        if (camera.sourceType === 'rtsp' && !merged.password) {
          throw new AppError(400, 'RTSP password is required');
        }

        try {
          camera.encryptedSourceConfig = encryptJson(merged);
        } catch (error) {
          throw mapEncryptionError(error);
        }
        camera.channelNumber = merged.channel;
      }

      if (!camera.isActive) {
        camera.lastKnownStatus = 'disabled';
      }

      await camera.save();

      try {
        await syncCameraToMediaMtx(camera);
      } catch (error) {
        throw mapMediaMtxSyncError(error);
      }

      await writeAuditLog({
        userId: req.user!.id,
        action: 'camera.update',
        entityType: 'Camera',
        entityId: String(camera._id),
        metadata: { siteSlug: site.slug, cameraKey: camera.cameraKey },
        ip: req.ip,
      });

      res.json(sanitizeCameraAdmin(camera));
    } catch (error) {
      next(error);
    }
  },
);

camerasRouter.delete(
  '/:id',
  validateParams(cameraIdParamSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const camera = await getCameraById(paramString(req, 'id'));

      try {
        await mediaMtxService.deletePath(camera.mediamtxPath);
      } catch {
        // Continue deletion even if MediaMTX cleanup fails.
      }

      await camera.deleteOne();

      await writeAuditLog({
        userId: req.user!.id,
        action: 'camera.delete',
        entityType: 'Camera',
        entityId: String(camera._id),
        metadata: { cameraKey: camera.cameraKey },
        ip: req.ip,
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);
