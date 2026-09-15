import { connectDatabase, disconnectDatabase } from '../config/database';
import { env } from '../config/env';
import { syncAllCamerasToMediaMtx } from '../services/mediamtx-sync.service';

async function main() {
  await connectDatabase();
  try {
    const forceAll = process.argv.includes('--all');

    if (env.STREAM_ON_DEMAND && !forceAll) {
      console.log('STREAM_ON_DEMAND=true — paths register when viewers open a site.');
      console.log('To register every camera now: npm run sync:mediamtx -- --all');
      return;
    }

    await syncAllCamerasToMediaMtx();
  } finally {
    await disconnectDatabase();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
