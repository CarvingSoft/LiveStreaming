import { env } from '../config/env';
import { RtspSourceConfig } from '../types';

function encodeCredential(value: string): string {
  return encodeURIComponent(value);
}

export function buildRtspUrl(config: RtspSourceConfig): string {
  const path = config.customPath?.trim()
    ? config.customPath.trim()
    : env.RTSP_DEFAULT_PATH_TEMPLATE.replace('{channel}', String(config.channel)).replace(
        '{subtype}',
        String(config.subtype),
      );

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const username = encodeCredential(config.username);
  const password = encodeCredential(config.password);

  return `rtsp://${username}:${password}@${config.host}:${config.port}${normalizedPath}`;
}

export function buildMediamtxPath(siteSlug: string, cameraKey: string): string {
  return `site-${siteSlug}-${cameraKey}`;
}

export function slugifyCameraKey(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}
