import { z } from 'zod';

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function slugifySiteSlug(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export const siteCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.preprocess(
    slugifySiteSlug,
    z.string().regex(slugRegex, 'Slug must be lowercase letters, numbers, and hyphens only'),
  ),
  description: z.string().max(500).optional(),
  organizationName: z.string().max(120).optional(),
  location: z.string().max(200).optional(),
  isActive: z.boolean().optional(),
  isPublic: z.boolean().optional(),
});

export const siteUpdateSchema = siteCreateSchema.partial();

export const siteIdParamSchema = z.object({
  id: z.string().min(1),
});

export const siteSlugParamSchema = z.object({
  slug: z.string().regex(slugRegex),
});

export const RESERVED_SLUGS = new Set(['login', 'admin', 'api', 'assets', 'health', 'stream']);
