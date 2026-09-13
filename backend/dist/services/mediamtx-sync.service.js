"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncCameraToMediaMtx = syncCameraToMediaMtx;
exports.syncAllCamerasToMediaMtx = syncAllCamerasToMediaMtx;
const camera_model_1 = require("../models/camera.model");
const encryption_service_1 = require("./encryption.service");
const mediamtx_service_1 = require("./mediamtx.service");
const rtsp_builder_service_1 = require("./rtsp-builder.service");
async function syncCameraToMediaMtx(camera) {
    if (!camera.isActive || camera.sourceType !== 'rtsp') {
        await mediamtx_service_1.mediaMtxService.deletePath(camera.mediamtxPath);
        return;
    }
    if (!camera.encryptedSourceConfig) {
        throw new Error('RTSP source configuration is required for active cameras');
    }
    let sourceConfig;
    try {
        sourceConfig = (0, encryption_service_1.decryptJson)(camera.encryptedSourceConfig);
    }
    catch {
        throw new Error('Stored camera credentials cannot be decrypted. Re-enter the RTSP password and save again.');
    }
    const rtspUrl = (0, rtsp_builder_service_1.buildRtspUrl)(sourceConfig);
    await mediamtx_service_1.mediaMtxService.upsertPath(camera.mediamtxPath, rtspUrl);
}
/**
 * Re-register all active RTSP cameras with MediaMTX. Paths added via the Control API
 * are lost when MediaMTX restarts; run this on backend startup and after mediamtx reload.
 */
async function syncAllCamerasToMediaMtx() {
    const cameras = await camera_model_1.Camera.find().select('name mediamtxPath sourceType encryptedSourceConfig isActive');
    let synced = 0;
    let failed = 0;
    for (const camera of cameras) {
        try {
            await syncCameraToMediaMtx(camera);
            if (camera.isActive && camera.sourceType === 'rtsp') {
                synced += 1;
                console.log(`MediaMTX synced: ${camera.mediamtxPath}`);
            }
        }
        catch (error) {
            failed += 1;
            const message = error instanceof Error ? error.message : 'unknown error';
            console.error(`MediaMTX sync failed for ${camera.mediamtxPath} (${camera.name}): ${message}`);
        }
    }
    console.log(`MediaMTX camera sync complete: ${synced} active, ${failed} failed`);
}
//# sourceMappingURL=mediamtx-sync.service.js.map