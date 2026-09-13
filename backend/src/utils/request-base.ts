import { Request } from 'express';
import { env } from '../config/env';

export function getRequestApiBase(req: Request): string {
  // Production uses the configured public API URL so stream endpoints stay HTTPS
  // even when Nginx→Node proxy headers are missing or misconfigured.
  if (env.NODE_ENV === 'production') {
    return env.API_PUBLIC_URL.replace(/\/$/, '');
  }

  const forwardedHost = req.get('x-forwarded-host');
  const host = forwardedHost ?? req.get('host');

  if (!host) {
    return env.API_PUBLIC_URL.replace(/\/$/, '');
  }

  const forwardedProto = req.get('x-forwarded-proto');
  const protocol = forwardedProto ?? req.protocol;
  return `${protocol}://${host}`.replace(/\/$/, '');
}

export function isPrivateDevOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      return true;
    }
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(url.hostname)) {
      return true;
    }
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(url.hostname)) {
      return true;
    }
    if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(url.hostname)) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
