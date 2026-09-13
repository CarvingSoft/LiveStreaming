"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchFromMediaMtx = fetchFromMediaMtx;
exports.fetchHlsManifestFromMediaMtx = fetchHlsManifestFromMediaMtx;
const DEFAULT_TIMEOUT_MS = 30_000;
const HLS_READY_RETRY_MS = 25_000;
const HLS_READY_RETRY_INTERVAL_MS = 2_000;
/**
 * Fetch from MediaMTX over internal HTTP. Handles LL-HLS cookie redirects when
 * cookieCheck=1 query is sufficient (Secure cookies are not sent over HTTP).
 */
async function fetchFromMediaMtx(url, init = {}) {
    const signal = init.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS);
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
async function fetchHlsManifestFromMediaMtx(url) {
    const started = Date.now();
    let lastResponse;
    while (Date.now() - started < HLS_READY_RETRY_MS) {
        const response = await fetchFromMediaMtx(url);
        if (response.ok) {
            return response;
        }
        lastResponse = response;
        // Only retry while the path/stream is still starting
        if (response.status !== 404 && response.status !== 503 && response.status !== 500) {
            break;
        }
        await sleep(HLS_READY_RETRY_INTERVAL_MS);
    }
    return lastResponse ?? (await fetchFromMediaMtx(url));
}
function isHlsManifest(url) {
    try {
        return new URL(url).pathname.endsWith('.m3u8');
    }
    catch {
        return url.includes('.m3u8');
    }
}
function appendCookieCheck(url) {
    const parsed = new URL(url);
    parsed.searchParams.set('cookieCheck', '1');
    return parsed.toString();
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=mediamtx-fetch.js.map