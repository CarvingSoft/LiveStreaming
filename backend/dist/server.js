"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const database_1 = require("./config/database");
const env_1 = require("./config/env");
const mediamtx_sync_service_1 = require("./services/mediamtx-sync.service");
const status_poller_service_1 = require("./services/status-poller.service");
async function bootstrap() {
    await (0, database_1.connectDatabase)();
    await (0, mediamtx_sync_service_1.syncAllCamerasToMediaMtx)();
    (0, status_poller_service_1.startStatusPoller)();
    const app = (0, app_1.createApp)();
    app.listen(env_1.env.PORT, '0.0.0.0', () => {
        console.log(`API listening on http://0.0.0.0:${env_1.env.PORT}`);
    });
}
bootstrap().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
//# sourceMappingURL=server.js.map