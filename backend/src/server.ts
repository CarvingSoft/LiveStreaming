import { createApp } from './app';
import { connectDatabase } from './config/database';
import { env } from './config/env';
import { syncAllCamerasToMediaMtx } from './services/mediamtx-sync.service';
import { startSiteIdlePruner } from './services/stream-ondemand.service';
import { startStatusPoller } from './services/status-poller.service';

async function bootstrap() {
  await connectDatabase();

  if (env.STREAM_ON_DEMAND) {
    console.log(
      'On-demand streaming enabled — RTSP/HLS start when viewers open a site; idle sites tear down after',
      Math.round(env.SITE_STREAM_IDLE_MS / 60_000),
      'minutes.',
    );
  } else {
    await syncAllCamerasToMediaMtx();
  }

  startStatusPoller();
  startSiteIdlePruner();

  const app = createApp();
  app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`API listening on http://0.0.0.0:${env.PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
