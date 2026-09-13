import { PlaybackTokenPayload, StreamStatus } from '../types';
export interface PlaybackSession {
    token: string;
    whepUrl: string;
    hlsUrl: string;
    status: StreamStatus;
    expiresAt: string;
    cameraName: string;
}
export declare class PlaybackService {
    issueToken(payload: Omit<PlaybackTokenPayload, 'type'>): {
        token: string;
        expiresAt: Date;
    };
    verifyToken(token: string): PlaybackTokenPayload;
    buildPublicUrls(token: string, apiPublicBase?: string): {
        whepUrl: string;
        hlsUrl: string;
    };
    createSession(input: {
        siteSlug: string;
        cameraKey: string;
        mediamtxPath: string;
        cameraName: string;
        isActive: boolean;
        apiPublicBase?: string;
    }): Promise<PlaybackSession>;
}
export declare const playbackService: PlaybackService;
//# sourceMappingURL=playback.service.d.ts.map