"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.corsOrigins = exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.coerce.number().default(5280),
    MONGODB_URI: zod_1.z.string().min(1),
    JWT_SECRET: zod_1.z.string().min(32),
    JWT_EXPIRES_IN: zod_1.z.string().default('1h'),
    PLAYBACK_JWT_SECRET: zod_1.z.string().min(32),
    PLAYBACK_TOKEN_TTL_SECONDS: zod_1.z.coerce.number().default(300),
    ENCRYPTION_KEY: zod_1.z.string().min(1),
    FRONTEND_URL: zod_1.z.string().url(),
    CORS_ORIGINS: zod_1.z.string().min(1),
    API_PUBLIC_URL: zod_1.z.string().url(),
    MEDIAMTX_API_URL: zod_1.z.string().url(),
    MEDIAMTX_WEBRTC_URL: zod_1.z.string().url(),
    MEDIAMTX_HLS_URL: zod_1.z.string().url(),
    RTSP_DEFAULT_PATH_TEMPLATE: zod_1.z.string().default('/cam/realmonitor?channel={channel}&subtype={subtype}'),
    STATUS_POLL_INTERVAL_MS: zod_1.z.coerce.number().default(15000),
    SEED_ADMIN_NAME: zod_1.z.string().default('Super Admin'),
    SEED_ADMIN_EMAIL: zod_1.z.string().email().optional(),
    SEED_ADMIN_PASSWORD: zod_1.z.string().min(8).optional(),
}).superRefine((data, ctx) => {
    if (data.NODE_ENV !== 'production') {
        return;
    }
    if (!data.API_PUBLIC_URL.startsWith('https://')) {
        ctx.addIssue({
            code: 'custom',
            path: ['API_PUBLIC_URL'],
            message: 'API_PUBLIC_URL must use https:// in production',
        });
    }
    if (!data.FRONTEND_URL.startsWith('https://')) {
        ctx.addIssue({
            code: 'custom',
            path: ['FRONTEND_URL'],
            message: 'FRONTEND_URL must use https:// in production',
        });
    }
    const corsOrigins = data.CORS_ORIGINS.split(',').map((origin) => origin.trim());
    if (!corsOrigins.includes(data.FRONTEND_URL)) {
        ctx.addIssue({
            code: 'custom',
            path: ['CORS_ORIGINS'],
            message: 'CORS_ORIGINS must include FRONTEND_URL in production',
        });
    }
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
    process.exit(1);
}
exports.env = parsed.data;
exports.corsOrigins = exports.env.CORS_ORIGINS.split(',').map((origin) => origin.trim());
//# sourceMappingURL=env.js.map