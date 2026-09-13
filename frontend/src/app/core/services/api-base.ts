import { environment } from '../../../environments/environment';

/**
 * Single source of truth for API base URL.
 * Dev: dynamic host + apiPort (LAN/mobile friendly).
 * Prod: configured apiUrl from environment.prod.ts.
 */
export function getApiBaseUrl(): string {
  if (typeof window === 'undefined' || environment.production) {
    return environment.apiUrl.replace(/\/$/, '');
  }

  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:${environment.apiPort}/api`;
}
