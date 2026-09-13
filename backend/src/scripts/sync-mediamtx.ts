import { connectDatabase } from '../config/database';
import { syncAllCamerasToMediaMtx } from '../services/mediamtx-sync.service';

async function main() {
  await connectDatabase();
  await syncAllCamerasToMediaMtx();
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
