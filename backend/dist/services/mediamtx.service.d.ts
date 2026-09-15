import { StreamStatus } from '../types';
interface MediaMtxPathStatus {
    name: string;
    ready: boolean;
    available?: boolean;
    sourceReady?: boolean;
    tracks?: unknown[];
    bytesReceived?: number;
}
interface MediaMtxHealth {
    ok: boolean;
    message?: string;
}
export declare class MediaMtxService {
    private readonly apiBase;
    healthCheck(): Promise<MediaMtxHealth>;
    /** Config API — use for add vs patch (avoids noisy runtime "path not found" logs). */
    hasConfigPath(pathName: string): Promise<boolean>;
    upsertPath(pathName: string, source: string): Promise<void>;
    deletePath(pathName: string): Promise<void>;
    getPath(pathName: string): Promise<MediaMtxPathStatus | null>;
    mapPathStatus(pathStatus: MediaMtxPathStatus | null, isActive: boolean): StreamStatus;
    getWhepInternalUrl(mediamtxPath: string): string;
    getHlsPathBaseUrl(mediamtxPath: string): string;
    getHlsInternalUrl(mediamtxPath: string, suffix?: string): string;
}
export declare const mediaMtxService: MediaMtxService;
export {};
//# sourceMappingURL=mediamtx.service.d.ts.map