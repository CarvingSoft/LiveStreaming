"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RESERVED_SLUGS = exports.siteSlugParamSchema = exports.siteIdParamSchema = exports.siteUpdateSchema = exports.siteCreateSchema = void 0;
const zod_1 = require("zod");
const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function slugifySiteSlug(value) {
    if (typeof value !== 'string')
        return value;
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
}
exports.siteCreateSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2).max(120),
    slug: zod_1.z.preprocess(slugifySiteSlug, zod_1.z.string().regex(slugRegex, 'Slug must be lowercase letters, numbers, and hyphens only')),
    description: zod_1.z.string().max(500).optional(),
    organizationName: zod_1.z.string().max(120).optional(),
    location: zod_1.z.string().max(200).optional(),
    isActive: zod_1.z.boolean().optional(),
    isPublic: zod_1.z.boolean().optional(),
});
exports.siteUpdateSchema = exports.siteCreateSchema.partial();
exports.siteIdParamSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
});
exports.siteSlugParamSchema = zod_1.z.object({
    slug: zod_1.z.string().regex(slugRegex),
});
exports.RESERVED_SLUGS = new Set(['login', 'admin', 'api', 'assets', 'health', 'stream']);
//# sourceMappingURL=site.validator.js.map