import { ICamera } from '../models/camera.model';
import { decryptJson } from '../services/encryption.service';
import { RtspSourceConfig } from '../types';

function sanitizeRtspSourceConfigForAdmin(encryptedSourceConfig?: string) {
  if (!encryptedSourceConfig) {
    return undefined;
  }

  try {
    const config = decryptJson<RtspSourceConfig>(encryptedSourceConfig);

    return {
      host: config.host,
      port: config.port,
      username: config.username,
      channel: config.channel,
      subtype: config.subtype,
      customPath: config.customPath,
    };
  } catch {
    // Wrong ENCRYPTION_KEY or corrupted payload — do not fail the whole request
    return { credentialsUnavailable: true as const };
  }
}

export function sanitizeCamera(camera: ICamera & { _id: unknown }) {
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

export function sanitizeCameraAdmin(camera: ICamera & { _id: unknown }) {
  return {
    ...sanitizeCamera(camera),
    sourceConfig: sanitizeRtspSourceConfigForAdmin(camera.encryptedSourceConfig),
  };
}

export function sanitizePublicCamera(camera: ICamera & { _id: unknown }) {
  return {
    id: String(camera._id),
    name: camera.name,
    cameraKey: camera.cameraKey,
    isActive: camera.isActive,
    sortOrder: camera.sortOrder,
    status: camera.lastKnownStatus,
  };
}

export function sanitizeSite(site: {
  _id: unknown;
  name: string;
  slug: string;
  description?: string;
  organizationName?: string;
  location?: string;
  isActive: boolean;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
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
