import { z } from 'zod';
export declare const rtspSourceSchema: z.ZodObject<{
    host: z.ZodString;
    port: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    username: z.ZodString;
    password: z.ZodPreprocess<z.ZodOptional<z.ZodString>, unknown>;
    channel: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    subtype: z.ZodDefault<z.ZodPreprocess<z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>]>, unknown>>;
    customPath: z.ZodPreprocess<z.ZodOptional<z.ZodString>, unknown>;
}, z.core.$strip>;
export declare const cameraCreateSchema: z.ZodObject<{
    name: z.ZodString;
    cameraKey: z.ZodPreprocess<z.ZodOptional<z.ZodString>, unknown>;
    channelNumber: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    sourceType: z.ZodDefault<z.ZodEnum<{
        connector: "connector";
        rtsp: "rtsp";
        vpn: "vpn";
    }>>;
    sourceConfig: z.ZodOptional<z.ZodObject<{
        host: z.ZodString;
        port: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
        username: z.ZodString;
        password: z.ZodPreprocess<z.ZodOptional<z.ZodString>, unknown>;
        channel: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
        subtype: z.ZodDefault<z.ZodPreprocess<z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>]>, unknown>>;
        customPath: z.ZodPreprocess<z.ZodOptional<z.ZodString>, unknown>;
    }, z.core.$strip>>;
    isActive: z.ZodOptional<z.ZodBoolean>;
    sortOrder: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
export declare const cameraUpdateSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    cameraKey: z.ZodOptional<z.ZodPreprocess<z.ZodOptional<z.ZodString>, unknown>>;
    channelNumber: z.ZodOptional<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    sourceType: z.ZodOptional<z.ZodDefault<z.ZodEnum<{
        connector: "connector";
        rtsp: "rtsp";
        vpn: "vpn";
    }>>>;
    isActive: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
    sortOrder: z.ZodOptional<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    sourceConfig: z.ZodOptional<z.ZodObject<{
        host: z.ZodPreprocess<z.ZodOptional<z.ZodString>, unknown>;
        port: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
        username: z.ZodPreprocess<z.ZodOptional<z.ZodString>, unknown>;
        password: z.ZodPreprocess<z.ZodOptional<z.ZodString>, unknown>;
        channel: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
        subtype: z.ZodPreprocess<z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>]>>, unknown>;
        customPath: z.ZodPreprocess<z.ZodOptional<z.ZodString>, unknown>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const cameraIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export declare const playbackParamSchema: z.ZodObject<{
    siteSlug: z.ZodString;
    cameraKey: z.ZodString;
}, z.core.$strip>;
//# sourceMappingURL=camera.validator.d.ts.map