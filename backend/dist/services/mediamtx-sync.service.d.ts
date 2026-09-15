export declare function syncCameraToMediaMtx(camera: {
    sourceType: string;
    encryptedSourceConfig?: string;
    mediamtxPath: string;
    isActive: boolean;
}): Promise<void>;
/** Register all cameras for one site (used when a viewer opens that site's live page). */
export declare function syncSiteCamerasToMediaMtx(siteSlug: string): Promise<void>;
/** Remove all MediaMTX paths for a site after idle timeout (on-demand mode). */
export declare function removeSiteFromMediaMtx(siteSlug: string): Promise<void>;
/**
 * Re-register all active RTSP cameras with MediaMTX. Used when STREAM_ON_DEMAND=false
 * or for manual recovery via npm run sync:mediamtx.
 */
export declare function syncAllCamerasToMediaMtx(): Promise<void>;
//# sourceMappingURL=mediamtx-sync.service.d.ts.map