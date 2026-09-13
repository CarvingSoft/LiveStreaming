import { ICamera } from '../models/camera.model';
export declare function sanitizeCamera(camera: ICamera & {
    _id: unknown;
}): {
    id: string;
    siteId: string;
    name: string;
    cameraKey: string;
    channelNumber: number | undefined;
    sourceType: import("../types").SourceType;
    mediamtxPath: undefined;
    isActive: boolean;
    sortOrder: number;
    lastKnownStatus: import("../types").StreamStatus;
    lastStatusAt: Date | undefined;
    hasPassword: boolean;
    createdAt: Date;
    updatedAt: Date;
};
export declare function sanitizeCameraAdmin(camera: ICamera & {
    _id: unknown;
}): {
    id: string;
    siteId: string;
    name: string;
    cameraKey: string;
    channelNumber: number | undefined;
    sourceType: import("../types").SourceType;
    mediamtxPath: undefined;
    isActive: boolean;
    sortOrder: number;
    lastKnownStatus: import("../types").StreamStatus;
    lastStatusAt: Date | undefined;
    hasPassword: boolean;
    createdAt: Date;
    updatedAt: Date;
    sourceConfig: {
        host: string;
        port: number;
        username: string;
        channel: number;
        subtype: 0 | 1;
        customPath: string | undefined;
        credentialsUnavailable?: undefined;
    } | {
        host?: undefined;
        port?: undefined;
        username?: undefined;
        channel?: undefined;
        subtype?: undefined;
        customPath?: undefined;
        credentialsUnavailable: true;
    } | undefined;
};
export declare function sanitizePublicCamera(camera: ICamera & {
    _id: unknown;
}): {
    id: string;
    name: string;
    cameraKey: string;
    isActive: boolean;
    sortOrder: number;
    status: import("../types").StreamStatus;
};
export declare function sanitizeSite(site: {
    _id: unknown;
    name: string;
    slug: string;
    description?: string;
    organizationName?: string;
    location?: string;
    isActive: boolean;
    isPublic: boolean;
    createdAt: Date;
    updatedAt: Date;
}): {
    id: string;
    name: string;
    slug: string;
    description: string | undefined;
    organizationName: string | undefined;
    location: string | undefined;
    isActive: boolean;
    isPublic: boolean;
    createdAt: Date;
    updatedAt: Date;
};
//# sourceMappingURL=sanitize.d.ts.map