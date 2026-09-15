"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchFromMediaMtx = fetchFromMediaMtx;
exports.fetchHlsManifestFromMediaMtx = fetchHlsManifestFromMediaMtx;
exports.buildMediaMtxHlsUrl = buildMediaMtxHlsUrl;
exports.rewriteHlsManifestForProxy = rewriteHlsManifestForProxy;
exports.parseSessionFromManifest = parseSessionFromManifest;
exports.extractMediaMtxHlsSession = extractMediaMtxHlsSession;
const env_1 = require("../config/env");
const hls_cookie_jar_1 = require("./hls-cookie-jar");
const DEFAULT_TIMEOUT_MS = 30_000;
const HLS_MANIFEST_TIMEOUT_MS = 25_000;
const HLS_READY_RETRY_MS = 45_000;
const HLS_READY_RETRY_INTERVAL_MS = 2_000;
function withMediaMtxAuth(init = {}) {
    const secret = env_1.env.MEDIAMTX_HLS_CDN_SECRET;
    if (!secret) {
        return init;
    }
    const headers = new Headers(init.headers ?? undefined);
    headers.set('Authorization', `Bearer ${secret}`);
    return { ...init, headers };
}
function isRetryableFetchError(error) {
    if (!(error instanceof Error)) {
        return false;
    }
    return (error.name === 'AbortError' ||
        error.message.includes('fetch failed') ||
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('ETIMEDOUT'));
}
/**
 * Fetch from MediaMTX over internal HTTP. Handles LL-HLS cookie redirects when
 * cookieCheck=1 query is sufficient (Secure cookies are not sent over HTTP).
 */
async function fetchFromMediaMtx(url, options = {}) {
    const init = (0, hls_cookie_jar_1.withCookieHeader)(withMediaMtxAuth(options.init ?? {}), options.cookie);
    const timeoutMs = isHlsManifest(url) ? HLS_MANIFEST_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;
    const signal = init.signal ?? AbortSignal.timeout(timeoutMs);
    if (isHlsManifest(url) && !url.includes('cookieCheck=1') && !url.includes('session=')) {
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
    if (!response.ok && isHlsManifest(url) && !url.includes('cookieCheck=1') && !url.includes('session=')) {
        response = await fetch(appendCookieCheck(url), { ...init, signal, redirect: 'follow' });
    }
    return response;
}
/**
 * Fetch an HLS manifest, retrying while MediaMTX pulls the RTSP source on demand.
 */
async function fetchHlsManifestFromMediaMtx(url, options = {}) {
    const maxWaitMs = options.maxWaitMs ?? HLS_READY_RETRY_MS;
    const started = Date.now();
    let lastResponse;
    let lastError;
    while (Date.now() - started < maxWaitMs) {
        try {
            const response = await fetchFromMediaMtx(url, options);
            if (response.ok) {
                return response;
            }
            lastResponse = response;
            lastError = undefined;
            if (response.status !== 404 &&
                response.status !== 401 &&
                response.status !== 502 &&
                response.status !== 503 &&
                response.status !== 500) {
                break;
            }
        }
        catch (error) {
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
/** Build internal MediaMTX HLS URL, forwarding fmp4 session/part query params from the browser. */
function buildMediaMtxHlsUrl(baseUrl, file, query = {}) {
    const parsed = new URL(`${baseUrl.replace(/\/$/, '')}/${file}`);
    for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null)
            continue;
        if (Array.isArray(value)) {
            if (typeof value[0] === 'string')
                parsed.searchParams.set(key, value[0]);
            continue;
        }
        if (typeof value === 'string') {
            parsed.searchParams.set(key, value);
        }
    }
    const isIndex = file === 'index.m3u8' || file.endsWith('/index.m3u8');
    if (isIndex && !parsed.searchParams.has('session') && !parsed.searchParams.has('cookieCheck')) {
        parsed.searchParams.set('cookieCheck', '1');
    }
    return parsed.toString();
}
/** Rewrite MediaMTX HLS playlist lines for the public API proxy, preserving ?session= etc. */
function rewriteHlsManifestForProxy(manifest, apiBase, token, injectSession) {
    return manifest
        .split('\n')
        .map((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
            return line;
        }
        const qIdx = trimmed.indexOf('?');
        const pathPart = qIdx >= 0 ? trimmed.slice(0, qIdx) : trimmed;
        let queryPart = qIdx >= 0 ? trimmed.slice(qIdx + 1) : '';
        const resource = pathPart.split('/').pop() ?? pathPart;
        let proxied = `${apiBase.replace(/\/$/, '')}/api/stream/hls/${token}/${resource}`;
        if (injectSession && !queryPart.includes('session=')) {
            queryPart = queryPart ? `${queryPart}&session=${encodeURIComponent(injectSession)}` : `session=${encodeURIComponent(injectSession)}`;
        }
        return queryPart ? `${proxied}?${queryPart}` : proxied;
    })
        .join('\n');
}
function parseSessionFromManifest(manifest) {
    for (const line of manifest.split('\n')) {
        const match = line.match(/[?&]session=([^&\s#]+)/);
        if (match?.[1]) {
            return decodeURIComponent(match[1]);
        }
    }
    return undefined;
}
function extractMediaMtxHlsSession(response) {
    try {
        const fromUrl = new URL(response.url).searchParams.get('session');
        if (fromUrl) {
            return fromUrl;
        }
    }
    catch {
        // ignore invalid URL
    }
    const headers = response.headers;
    const setCookies = typeof headers.getSetCookie === 'function'
        ? headers.getSetCookie.call(response.headers)
        : [];
    if (setCookies.length === 0) {
        const single = response.headers.get('set-cookie');
        if (single) {
            setCookies.push(single);
        }
    }
    for (const raw of setCookies) {
        const nameValue = raw.split(';')[0]?.trim();
        const eq = nameValue?.indexOf('=') ?? -1;
        if (eq <= 0) {
            continue;
        }
        const name = nameValue.slice(0, eq);
        const value = nameValue.slice(eq + 1);
        if (name !== 'cookieCheck' && value) {
            return value;
        }
    }
    return undefined;
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=mediamtx-fetch.js.map