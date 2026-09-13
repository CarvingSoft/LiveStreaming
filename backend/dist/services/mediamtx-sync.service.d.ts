export declare function syncCameraToMediaMtx(camera: {
    sourceType: string;
    encryptedSourceConfig?: string;
    mediamtxPath: string;
    isActive: boolean;
}): Promise<void>;
/**
 * Re-register all active RTSP cameras with MediaMTX. Paths added via the Control API
 * are lost when MediaMTX restarts; run this on backend startup and after mediamtx reload.
 */
export declare function syncAllCamerasToMediaMtx(): Promise<void>;
//# sourceMappingURL=mediamtx-sync.service.d.ts.map