import { withCookieHeader } from './hls-cookie-jar';

const DEFAULT_TIMEOUT_MS = 30_000;
const HLS_MANIFEST_TIMEOUT_MS = 12_000;
const HLS_READY_RETRY_MS = 15_000;
const HLS_READY_RETRY_INTERVAL_MS = 2_000;

export interface MediaMtxFetchOptions {
  init?: RequestInit;
  cookie?: string;
  /** Cap total wait for manifest polling (browser requests must not block too long). */
  maxWaitMs?: number;
}

function isRetryableFetchError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === 'AbortError' ||
    error.message.includes('fetch failed') ||
    error.message.includes('ECONNREFUSED') ||
    error.message.includes('ETIMEDOUT')
  );
}

/**
 * Fetch from MediaMTX over internal HTTP. Handles LL-HLS cookie redirects when
 * cookieCheck=1 query is sufficient (Secure cookies are not sent over HTTP).
 */
export async function fetchFromMediaMtx(
  url: string,
  options: MediaMtxFetchOptions = {},
): Promise<Response> {
  const init = withCookieHeader(options.init ?? {}, options.cookie);
  const timeoutMs = isHlsManifest(url) ? HLS_MANIFEST_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;
  const signal = init.signal ?? AbortSignal.timeout(timeoutMs);

  if (isHlsManifest(url) && !url.includes('cookieCheck=1')) {
    const withCookieCheck = await fetch(appendCookieCheck(url), {
      ...init,
      signal,
      redirect: 'follow',
    });
    if (withCookieCheck.ok) {
      return withCookieCheck;
    }
  }

  let response = await fetch(url, { ...init, signal, redirect: 'manual' });

  if (response.status === 302 || response.status === 307) {
    const location = response.headers.get('location');
    const nextUrl = location ? new URL(location, url).toString() : appendCookieCheck(url);
    response = await fetch(nextUrl, { ...init, signal, redirect: 'follow' });
  }

  if (!response.ok && isHlsManifest(url) && !url.includes('cookieCheck=1')) {
    response = await fetch(appendCookieCheck(url), { ...init, signal, redirect: 'follow' });
  }

  return response;
}

/**
 * Fetch an HLS manifest, retrying while MediaMTX pulls the RTSP source on demand.
 */
export async function fetchHlsManifestFromMediaMtx(
  url: string,
  options: MediaMtxFetchOptions = {},
): Promise<Response> {
  const maxWaitMs = options.maxWaitMs ?? HLS_READY_RETRY_MS;
  const started = Date.now();
  let lastResponse: Response | undefined;
  let lastError: Error | undefined;

  while (Date.now() - started < maxWaitMs) {
    try {
      const response = await fetchFromMediaMtx(url, options);
      if (response.ok) {
        return response;
      }

      lastResponse = response;
      lastError = undefined;

      if (
        response.status !== 404 &&
        response.status !== 401 &&
        response.status !== 502 &&
        response.status !== 503 &&
        response.status !== 500
      ) {
        break;
      }
    } catch (error) {
      if (!isRetryableFetchError(error)) {
        throw error;
      }

      lastError = error instanceof Error ? error : new Error(String(error));
    }

    await sleep(HLS_READY_RETRY_INTERVAL_MS);
  }

  if (lastResponse) {
    return lastResponse;
  }

  if (lastError) {
    throw lastError;
  }

  return fetchFromMediaMtx(url, options);
}

function isHlsManifest(url: string): boolean {
  try {
    return new URL(url).pathname.endsWith('.m3u8');
  } catch {
    return url.includes('.m3u8');
  }
}

function appendCookieCheck(url: string): string {
  const parsed = new URL(url);
  parsed.searchParams.set('cookieCheck', '1');
  return parsed.toString();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
