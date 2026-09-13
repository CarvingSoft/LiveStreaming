import { Camera } from '../models/camera.model';
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

/**
 * Re-register all active RTSP cameras with MediaMTX. Paths added via the Control API
 * are lost when MediaMTX restarts; run this on backend startup and after mediamtx reload.
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
