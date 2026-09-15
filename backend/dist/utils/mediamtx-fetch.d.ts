export interface MediaMtxFetchOptions {
    init?: RequestInit;
    cookie?: string;
    /** Cap total wait for manifest polling (browser requests must not block too long). */
    maxWaitMs?: number;
}
/**
 * Fetch from MediaMTX over internal HTTP. Handles LL-HLS cookie redirects when
 * cookieCheck=1 query is sufficient (Secure cookies are not sent over HTTP).
 */
export declare function fetchFromMediaMtx(url: string, options?: MediaMtxFetchOptions): Promise<Response>;
/**
 * Fetch an HLS manifest, retrying while MediaMTX pulls the RTSP source on demand.
 */
export declare function fetchHlsManifestFromMediaMtx(url: string, options?: MediaMtxFetchOptions): Promise<Response>;
/** Build internal MediaMTX HLS URL, forwarding fmp4 session/part query params from the browser. */
export declare function buildMediaMtxHlsUrl(baseUrl: string, file: string, query?: Record<string, unknown>): string;
/** Rewrite MediaMTX HLS playlist lines for the public API proxy, preserving ?session= etc. */
export declare function rewriteHlsManifestForProxy(manifest: string, apiBase: string, token: string, injectSession?: string): string;
export declare function parseSessionFromManifest(manifest: string): string | undefined;
export declare function extractMediaMtxHlsSession(response: Response): string | undefined;
//# sourceMappingURL=mediamtx-fetch.d.ts.map