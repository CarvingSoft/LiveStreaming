"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRouter = void 0;
const express_1 = require("express");
const database_1 = require("../config/database");
const env_1 = require("../config/env");
const encryption_service_1 = require("../services/encryption.service");
const mediamtx_service_1 = require("../services/mediamtx.service");
exports.healthRouter = (0, express_1.Router)();
exports.healthRouter.get('/', async (_req, res) => {
    const mediamtx = await mediamtx_service_1.mediaMtxService.healthCheck();
    const encryptionKeyOk = (0, encryption_service_1.isValidEncryptionKey)(env_1.env.ENCRYPTION_KEY);
    const status = (0, database_1.isDatabaseConnected)() && mediamtx.ok && encryptionKeyOk ? 'ok' : 'degraded';
    res.json({
        status,
        db: (0, database_1.isDatabaseConnected)() ? 'connected' : 'disconnected',
        mediamtx,
        encryptionKeyOk,
        timestamp: new Date().toISOString(),
    });
});
//# sourceMappingURL=health.routes.js.map