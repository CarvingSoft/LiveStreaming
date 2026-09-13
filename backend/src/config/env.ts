import dotenv from 'dotenv';
import { z } from 'zod';
import { isValidEncryptionKey } from '../services/encryption.service';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5280),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('1h'),
  PLAYBACK_JWT_SECRET: z.string().min(32),
  PLAYBACK_TOKEN_TTL_SECONDS: z.coerce.number().default(300),
  ENCRYPTION_KEY: z.string().min(1),
  FRONTEND_URL: z.string().url(),
  CORS_ORIGINS: z.string().min(1),
  API_PUBLIC_URL: z.string().url(),
  MEDIAMTX_API_URL: z.string().url(),
  MEDIAMTX_WEBRTC_URL: z.string().url(),
  MEDIAMTX_HLS_URL: z.string().url(),
  RTSP_DEFAULT_PATH_TEMPLATE: z.string().default('/cam/realmonitor?channel={channel}&subtype={subtype}'),
  STATUS_POLL_INTERVAL_MS: z.coerce.number().default(15000),
  SEED_ADMIN_NAME: z.string().default('Super Admin'),
  SEED_ADMIN_EMAIL: z.string().email().optional(),
  SEED_ADMIN_PASSWORD: z.string().min(8).optional(),
}).superRefine((data, ctx) => {
  if (!isValidEncryptionKey(data.ENCRYPTION_KEY)) {
    ctx.addIssue({
      code: 'custom',
      path: ['ENCRYPTION_KEY'],
      message:
        'ENCRYPTION_KEY must be a base64-encoded 32-byte key (generate with: openssl rand -base64 32)',
    });
  }

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

export const env = parsed.data;

export const corsOrigins = env.CORS_ORIGINS.split(',').map((origin) => origin.trim());
