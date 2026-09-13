"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCameraById = getCameraById;
exports.getCameraBySiteAndKey = getCameraBySiteAndKey;
const camera_model_1 = require("../models/camera.model");
const errors_1 = require("../utils/errors");
async function getCameraById(id) {
    const camera = await camera_model_1.Camera.findById(id);
    if (!camera) {
        throw new errors_1.AppError(404, 'Camera not found');
    }
    return camera;
}
async function getCameraBySiteAndKey(siteId, cameraKey) {
    const camera = await camera_model_1.Camera.findOne({ siteId, cameraKey });
    if (!camera) {
        throw new errors_1.AppError(404, 'Camera not found');
    }
    return camera;
}
//# sourceMappingURL=camera.repository.js.map