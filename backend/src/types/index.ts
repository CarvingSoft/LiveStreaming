export type UserRole = 'super_admin' | 'admin';

export type SourceType = 'rtsp' | 'connector' | 'vpn';

export type StreamStatus = 'online' | 'offline' | 'connecting' | 'error' | 'disabled';

export interface RtspSourceConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  channel: number;
  subtype: 0 | 1;
  customPath?: string;
}

export interface PlaybackTokenPayload {
  siteSlug: string;
  cameraKey: string;
  mediamtxPath: string;
  type: 'playback';
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}
