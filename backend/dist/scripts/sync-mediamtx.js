"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const env_1 = require("../config/env");
const mediamtx_sync_service_1 = require("../services/mediamtx-sync.service");
async function main() {
    await (0, database_1.connectDatabase)();
    try {
        const forceAll = process.argv.includes('--all');
        if (env_1.env.STREAM_ON_DEMAND && !forceAll) {
            console.log('STREAM_ON_DEMAND=true — paths register when viewers open a site.');
            console.log('To register every camera now: npm run sync:mediamtx -- --all');
            return;
        }
        await (0, mediamtx_sync_service_1.syncAllCamerasToMediaMtx)();
    }
    finally {
        await (0, database_1.disconnectDatabase)();
    }
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
//# sourceMappingURL=sync-mediamtx.js.map