"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncCameraToMediaMtx = syncCameraToMediaMtx;
exports.syncSiteCamerasToMediaMtx = syncSiteCamerasToMediaMtx;
exports.removeSiteFromMediaMtx = removeSiteFromMediaMtx;
exports.syncAllCamerasToMediaMtx = syncAllCamerasToMediaMtx;
const camera_model_1 = require("../models/camera.model");
const site_repository_1 = require("../repositories/site.repository");
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
/** Register all cameras for one site (used when a viewer opens that site's live page). */
async function syncSiteCamerasToMediaMtx(siteSlug) {
    const site = await (0, site_repository_1.getSiteBySlug)(siteSlug);
    const cameras = await camera_model_1.Camera.find({ siteId: site._id }).select('name mediamtxPath sourceType encryptedSourceConfig isActive');
    for (const camera of cameras) {
        try {
            await syncCameraToMediaMtx(camera);
            if (camera.isActive && camera.sourceType === 'rtsp') {
                console.log(`MediaMTX synced (site ${siteSlug}): ${camera.mediamtxPath}`);
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'unknown error';
            console.error(`MediaMTX sync failed for ${camera.mediamtxPath} (${camera.name}): ${message}`);
        }
    }
}
/** Remove all MediaMTX paths for a site after idle timeout (on-demand mode). */
async function removeSiteFromMediaMtx(siteSlug) {
    const site = await (0, site_repository_1.getSiteBySlug)(siteSlug);
    const cameras = await camera_model_1.Camera.find({ siteId: site._id }).select('mediamtxPath');
    for (const camera of cameras) {
        await mediamtx_service_1.mediaMtxService.deletePath(camera.mediamtxPath);
    }
    await camera_model_1.Camera.updateMany({ siteId: site._id }, { lastKnownStatus: 'offline', lastStatusAt: new Date() });
}
/**
 * Re-register all active RTSP cameras with MediaMTX. Used when STREAM_ON_DEMAND=false
 * or for manual recovery via npm run sync:mediamtx.
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