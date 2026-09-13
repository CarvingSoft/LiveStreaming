"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startStatusPoller = startStatusPoller;
exports.stopStatusPoller = stopStatusPoller;
const env_1 = require("../config/env");
const camera_model_1 = require("../models/camera.model");
const mediamtx_service_1 = require("./mediamtx.service");
let pollTimer = null;
function startStatusPoller() {
    if (pollTimer)
        return;
    pollTimer = setInterval(async () => {
        try {
            const cameras = await camera_model_1.Camera.find({ isActive: true }).select('_id mediamtxPath isActive');
            await Promise.all(cameras.map(async (camera) => {
                try {
                    const pathStatus = await mediamtx_service_1.mediaMtxService.getPath(camera.mediamtxPath);
                    const status = mediamtx_service_1.mediaMtxService.mapPathStatus(pathStatus, camera.isActive);
                    await camera_model_1.Camera.updateOne({ _id: camera._id }, { lastKnownStatus: status, lastStatusAt: new Date() });
                }
                catch {
                    await camera_model_1.Camera.updateOne({ _id: camera._id }, { lastKnownStatus: 'error', lastStatusAt: new Date() });
                }
            }));
        }
        catch {
            // Ignore polling errors; health endpoint will surface connectivity issues.
        }
    }, env_1.env.STATUS_POLL_INTERVAL_MS);
}
function stopStatusPoller() {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
}
//# sourceMappingURL=status-poller.service.js.map