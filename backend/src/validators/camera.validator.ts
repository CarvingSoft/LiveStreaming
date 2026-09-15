import { z } from 'zod';
import { slugifyCameraKey } from '../services/rtsp-builder.service';
import { publicRtspHostError } from '../utils/network';

const cameraKeyRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function emptyToUndefined(value: unknown): unknown {
  if (value === '' || value === null || value === undefined) {
    return undefined;
  }
  return value;
}

const rtspHostSchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .superRefine((host, ctx) => {
    const message = publicRtspHostError(host);
    if (message) {
      ctx.addIssue({ code: 'custom', message });
    }
  });

export const rtspSourceSchema = z.object({
  host: rtspHostSchema,
  port: z.coerce.number().int().min(1).max(65535).default(11554),
  username: z.string().trim().min(1).max(120),
  password: z.preprocess(
    emptyToUndefined,
    z.string().min(1).max(120).optional(),
  ),
  channel: z.coerce.number().int().min(1).max(256).default(1),
  subtype: z.preprocess(
    (value) => {
      if (value === '' || value === null || value === undefined) {
        return 0;
      }
      return Number(value);
    },
    z.union([z.literal(0), z.literal(1)]),
  ).default(0),
  customPath: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(500).optional(),
  ),
});

export const cameraCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  cameraKey: z.preprocess(
    (value) => {
      if (value === '' || value === null || value === undefined) {
        return undefined;
      }
      const slug = slugifyCameraKey(String(value));
      return slug || undefined;
    },
    z.string().regex(cameraKeyRegex).optional(),
  ),
  channelNumber: z.coerce.number().int().min(1).max(256).optional(),
  sourceType: z.enum(['rtsp', 'connector', 'vpn']).default('rtsp'),
  sourceConfig: rtspSourceSchema.optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

const rtspSourcePartialSchema = z.object({
  host: z.preprocess(emptyToUndefined, rtspHostSchema.optional()),
  port: z.coerce.number().int().min(1).max(65535).optional(),
  username: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(120).optional()),
  password: z.preprocess(emptyToUndefined, z.string().min(1).max(120).optional()),
  channel: z.coerce.number().int().min(1).max(256).optional(),
  subtype: z.preprocess(
    (value) => {
      if (value === '' || value === null || value === undefined) {
        return undefined;
      }
      return Number(value);
    },
    z.union([z.literal(0), z.literal(1)]).optional(),
  ),
  customPath: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional()),
});

export const cameraUpdateSchema = cameraCreateSchema
  .partial()
  .extend({
    sourceConfig: rtspSourcePartialSchema.optional(),
  });

export const cameraIdParamSchema = z.object({
  id: z.string().min(1),
});

export const playbackParamSchema = z.object({
  siteSlug: z.string().min(1),
  cameraKey: z.string().min(1),
});
