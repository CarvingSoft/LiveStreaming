"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.playbackParamSchema = exports.cameraIdParamSchema = exports.cameraUpdateSchema = exports.cameraCreateSchema = exports.rtspSourceSchema = void 0;
const zod_1 = require("zod");
const rtsp_builder_service_1 = require("../services/rtsp-builder.service");
const cameraKeyRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function emptyToUndefined(value) {
    if (value === '' || value === null || value === undefined) {
        return undefined;
    }
    return value;
}
exports.rtspSourceSchema = zod_1.z.object({
    host: zod_1.z.string().trim().min(1).max(255),
    port: zod_1.z.coerce.number().int().min(1).max(65535).default(554),
    username: zod_1.z.string().trim().min(1).max(120),
    password: zod_1.z.preprocess(emptyToUndefined, zod_1.z.string().min(1).max(120).optional()),
    channel: zod_1.z.coerce.number().int().min(1).max(256).default(1),
    subtype: zod_1.z.preprocess((value) => {
        if (value === '' || value === null || value === undefined) {
            return 0;
        }
        return Number(value);
    }, zod_1.z.union([zod_1.z.literal(0), zod_1.z.literal(1)])).default(0),
    customPath: zod_1.z.preprocess(emptyToUndefined, zod_1.z.string().trim().max(500).optional()),
});
exports.cameraCreateSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2).max(120),
    cameraKey: zod_1.z.preprocess((value) => {
        if (value === '' || value === null || value === undefined) {
            return undefined;
        }
        const slug = (0, rtsp_builder_service_1.slugifyCameraKey)(String(value));
        return slug || undefined;
    }, zod_1.z.string().regex(cameraKeyRegex).optional()),
    channelNumber: zod_1.z.coerce.number().int().min(1).max(256).optional(),
    sourceType: zod_1.z.enum(['rtsp', 'connector', 'vpn']).default('rtsp'),
    sourceConfig: exports.rtspSourceSchema.optional(),
    isActive: zod_1.z.boolean().optional(),
    sortOrder: zod_1.z.coerce.number().int().min(0).optional(),
});
const rtspSourcePartialSchema = zod_1.z.object({
    host: zod_1.z.preprocess(emptyToUndefined, zod_1.z.string().trim().min(1).max(255).optional()),
    port: zod_1.z.coerce.number().int().min(1).max(65535).optional(),
    username: zod_1.z.preprocess(emptyToUndefined, zod_1.z.string().trim().min(1).max(120).optional()),
    password: zod_1.z.preprocess(emptyToUndefined, zod_1.z.string().min(1).max(120).optional()),
    channel: zod_1.z.coerce.number().int().min(1).max(256).optional(),
    subtype: zod_1.z.preprocess((value) => {
        if (value === '' || value === null || value === undefined) {
            return undefined;
        }
        return Number(value);
    }, zod_1.z.union([zod_1.z.literal(0), zod_1.z.literal(1)]).optional()),
    customPath: zod_1.z.preprocess(emptyToUndefined, zod_1.z.string().trim().max(500).optional()),
});
exports.cameraUpdateSchema = exports.cameraCreateSchema
    .partial()
    .extend({
    sourceConfig: rtspSourcePartialSchema.optional(),
});
exports.cameraIdParamSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
});
exports.playbackParamSchema = zod_1.z.object({
    siteSlug: zod_1.z.string().min(1),
    cameraKey: zod_1.z.string().min(1),
});
//# sourceMappingURL=camera.validator.js.map