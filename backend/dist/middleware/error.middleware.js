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
function isMongoCastError(err) {
    return Boolean(err && typeof err === 'object' && 'name' in err && err.name === 'CastError');
}
function errorHandler(err, _req, res, _next) {
    if (err instanceof errors_1.AppError) {
        res.status(err.statusCode).json({
            message: err.message,
            details: env_1.env.NODE_ENV === 'development' ? err.details : undefined,
        });
        return;
    }
    if (isMongoCastError(err)) {
        res.status(400).json({ message: 'Invalid id format' });
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
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('fetch failed') || message.includes('ECONNREFUSED')) {
        res.status(503).json({
            message: 'MediaMTX HLS is unreachable from the API. Check systemctl status mediamtx, port 8888, and MEDIAMTX_HLS_URL=http://127.0.0.1:8888 in backend/.env.',
        });
        return;
    }
    if (message.includes('ENCRYPTION_KEY')) {
        res.status(503).json({
            message: 'Server ENCRYPTION_KEY is invalid. Set a base64-encoded 32-byte key in backend/.env (openssl rand -base64 32), then restart PM2.',
        });
        return;
    }
    console.error('Unhandled error:', message);
    res.status(500).json({ message: 'Internal server error' });
}
//# sourceMappingURL=error.middleware.js.map