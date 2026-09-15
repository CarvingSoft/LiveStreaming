import { Camera } from '../models/camera.model';
import { getSiteBySlug } from '../repositories/site.repository';
import { decryptJson } from './encryption.service';
import { mediaMtxService } from './mediamtx.service';
import { buildRtspUrl } from './rtsp-builder.service';
import { RtspSourceConfig } from '../types';

export async function syncCameraToMediaMtx(camera: {
  sourceType: string;
  encryptedSourceConfig?: string;
  mediamtxPath: string;
  isActive: boolean;
}): Promise<void> {
  if (!camera.isActive || camera.sourceType !== 'rtsp') {
    await mediaMtxService.deletePath(camera.mediamtxPath);
    return;
  }

  if (!camera.encryptedSourceConfig) {
    throw new Error('RTSP source configuration is required for active cameras');
  }

  let sourceConfig: RtspSourceConfig;
  try {
    sourceConfig = decryptJson<RtspSourceConfig>(camera.encryptedSourceConfig);
  } catch {
    throw new Error(
      'Stored camera credentials cannot be decrypted. Re-enter the RTSP password and save again.',
    );
  }

  const rtspUrl = buildRtspUrl(sourceConfig);
  await mediaMtxService.upsertPath(camera.mediamtxPath, rtspUrl);
}

/** Register all cameras for one site (used when a viewer opens that site's live page). */
export async function syncSiteCamerasToMediaMtx(siteSlug: string): Promise<void> {
  const site = await getSiteBySlug(siteSlug);
  const cameras = await Camera.find({ siteId: site._id }).select(
    'name mediamtxPath sourceType encryptedSourceConfig isActive',
  );

  for (const camera of cameras) {
    try {
      await syncCameraToMediaMtx(camera);
      if (camera.isActive && camera.sourceType === 'rtsp') {
        console.log(`MediaMTX synced (site ${siteSlug}): ${camera.mediamtxPath}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      console.error(`MediaMTX sync failed for ${camera.mediamtxPath} (${camera.name}): ${message}`);
    }
  }
}

/** Remove all MediaMTX paths for a site after idle timeout (on-demand mode). */
export async function removeSiteFromMediaMtx(siteSlug: string): Promise<void> {
  const site = await getSiteBySlug(siteSlug);
  const cameras = await Camera.find({ siteId: site._id }).select('mediamtxPath');

  for (const camera of cameras) {
    await mediaMtxService.deletePath(camera.mediamtxPath);
  }

  await Camera.updateMany(
    { siteId: site._id },
    { lastKnownStatus: 'offline', lastStatusAt: new Date() },
  );
}

/**
 * Re-register all active RTSP cameras with MediaMTX. Used when STREAM_ON_DEMAND=false
 * or for manual recovery via npm run sync:mediamtx.
 */
export async function syncAllCamerasToMediaMtx(): Promise<void> {
  const cameras = await Camera.find().select(
    'name mediamtxPath sourceType encryptedSourceConfig isActive',
  );

  let synced = 0;
  let failed = 0;

  for (const camera of cameras) {
    try {
      await syncCameraToMediaMtx(camera);
      if (camera.isActive && camera.sourceType === 'rtsp') {
        synced += 1;
        console.log(`MediaMTX synced: ${camera.mediamtxPath}`);
      }
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : 'unknown error';
      console.error(`MediaMTX sync failed for ${camera.mediamtxPath} (${camera.name}): ${message}`);
    }
  }

  console.log(`MediaMTX camera sync complete: ${synced} active, ${failed} failed`);
}
