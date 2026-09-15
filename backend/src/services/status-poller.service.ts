import { env } from '../config/env';
import { Camera } from '../models/camera.model';
import { mediaMtxService } from './mediamtx.service';
import { isSiteStreamingActive } from './stream-ondemand.service';

function populatedSiteSlug(siteId: unknown): string | undefined {
  if (siteId && typeof siteId === 'object' && 'slug' in siteId) {
    const slug = (siteId as { slug?: unknown }).slug;
    return typeof slug === 'string' ? slug : undefined;
  }
  return undefined;
}

let pollTimer: NodeJS.Timeout | null = null;

export function startStatusPoller(): void {
  if (pollTimer) return;

  pollTimer = setInterval(async () => {
    try {
      const cameras = await Camera.find({ isActive: true })
        .select('_id mediamtxPath isActive siteId')
        .populate('siteId', 'slug');

      await Promise.all(
        cameras.map(async (camera) => {
          const siteSlug = populatedSiteSlug(camera.siteId);

          if (env.STREAM_ON_DEMAND && siteSlug && !isSiteStreamingActive(siteSlug)) {
            return;
          }

          try {
            const pathStatus = await mediaMtxService.getPath(camera.mediamtxPath);
            const status = mediaMtxService.mapPathStatus(pathStatus, camera.isActive);
            await Camera.updateOne(
              { _id: camera._id },
              { lastKnownStatus: status, lastStatusAt: new Date() },
            );
          } catch {
            await Camera.updateOne(
              { _id: camera._id },
              { lastKnownStatus: 'error', lastStatusAt: new Date() },
            );
          }
        }),
      );
    } catch {
      // Ignore polling errors; health endpoint will surface connectivity issues.
    }
  }, env.STATUS_POLL_INTERVAL_MS);
}

export function stopStatusPoller(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}
