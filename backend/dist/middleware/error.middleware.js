"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = notFoundHandler;
exports.errorHandler = errorHandler;
const errors_1 = require("../utils/errors");
const env_1 = require("../config/env");
function notFoundHandler(_req, res) {
    res.status(404).json({ message: 'Route not found' });
}
function isMongoDuplicateKeyError(err) {
    return Boolean(err && typeof err === 'object' && 'code' in err && err.code === 11000);
}
function errorHandler(err, _req, res, _next) {
    if (err instanceof errors_1.AppError) {
        res.status(err.statusCode).json({
            message: err.message,
            details: env_1.env.NODE_ENV === 'development' ? err.details : undefined,
        });
        return;
    }
    if (isMongoDuplicateKeyError(err)) {
        const keys = Object.keys(err.keyPattern ?? {});
        const message = keys.includes('slug')
            ? 'Site slug already exists'
            : keys.includes('cameraKey')
                ? 'Camera key already exists on this site'
                : 'Duplicate value already exists';
        res.status(409).json({ message });
        return;
    }
    console.error('Unhandled error:', err instanceof Error ? err.message : err);
    res.status(500).json({ message: 'Internal server error' });
}
//# sourceMappingURL=error.middleware.js.map