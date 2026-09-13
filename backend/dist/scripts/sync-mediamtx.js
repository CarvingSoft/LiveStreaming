"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const mediamtx_sync_service_1 = require("../services/mediamtx-sync.service");
async function main() {
    await (0, database_1.connectDatabase)();
    await (0, mediamtx_sync_service_1.syncAllCamerasToMediaMtx)();
    process.exit(0);
}
main().catch((error) => {
    console.error(error);
    process.exit(1);
});
//# sourceMappingURL=sync-mediamtx.js.map