/**
 * Fetch from MediaMTX over internal HTTP. Handles LL-HLS cookie redirects when
 * cookieCheck=1 query is sufficient (Secure cookies are not sent over HTTP).
 */
export declare function fetchFromMediaMtx(url: string, init?: RequestInit): Promise<Response>;
/**
 * Fetch an HLS manifest, retrying while MediaMTX pulls the RTSP source on demand.
 */
export declare function fetchHlsManifestFromMediaMtx(url: string): Promise<Response>;
//# sourceMappingURL=mediamtx-fetch.d.ts.map