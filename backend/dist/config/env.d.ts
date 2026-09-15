export declare const env: {
    NODE_ENV: "development" | "production" | "test";
    PORT: number;
    MONGODB_URI: string;
    JWT_SECRET: string;
    JWT_EXPIRES_IN: string;
    PLAYBACK_JWT_SECRET: string;
    PLAYBACK_TOKEN_TTL_SECONDS: number;
    ENCRYPTION_KEY: string;
    FRONTEND_URL: string;
    CORS_ORIGINS: string;
    API_PUBLIC_URL: string;
    MEDIAMTX_API_URL: string;
    MEDIAMTX_WEBRTC_URL: string;
    MEDIAMTX_HLS_URL: string;
    MEDIAMTX_HLS_CDN_SECRET?: string | undefined;
    RTSP_DEFAULT_PATH_TEMPLATE: string;
    STATUS_POLL_INTERVAL_MS: number;
    STREAM_ON_DEMAND: boolean;
    SITE_STREAM_IDLE_MS: number;
    SITE_IDLE_CHECK_INTERVAL_MS: number;
    SEED_ADMIN_NAME: string;
    SEED_ADMIN_EMAIL?: string | undefined;
    SEED_ADMIN_PASSWORD?: string | undefined;
};
export declare const corsOrigins: string[];
//# sourceMappingURL=env.d.ts.map