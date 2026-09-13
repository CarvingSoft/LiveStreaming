import { z } from 'zod';
export declare const siteCreateSchema: z.ZodObject<{
    name: z.ZodString;
    slug: z.ZodPreprocess<z.ZodString, unknown>;
    description: z.ZodOptional<z.ZodString>;
    organizationName: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
    isActive: z.ZodOptional<z.ZodBoolean>;
    isPublic: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const siteUpdateSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    slug: z.ZodOptional<z.ZodPreprocess<z.ZodString, unknown>>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    organizationName: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    location: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    isActive: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
    isPublic: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
export declare const siteIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export declare const siteSlugParamSchema: z.ZodObject<{
    slug: z.ZodString;
}, z.core.$strip>;
export declare const RESERVED_SLUGS: Set<string>;
//# sourceMappingURL=site.validator.d.ts.map