import { connectDatabase, disconnectDatabase } from '../config/database';
import { syncAllCamerasToMediaMtx } from '../services/mediamtx-sync.service';

async function main() {
  await connectDatabase();
  try {
    await syncAllCamerasToMediaMtx();
  } finally {
    await disconnectDatabase();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
