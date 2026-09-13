import { createApp } from './app';
import { connectDatabase } from './config/database';
import { env } from './config/env';
import { syncAllCamerasToMediaMtx } from './services/mediamtx-sync.service';
import { startStatusPoller } from './services/status-poller.service';

async function bootstrap() {
  await connectDatabase();
  await syncAllCamerasToMediaMtx();
  startStatusPoller();

  const app = createApp();
  app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`API listening on http://0.0.0.0:${env.PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
