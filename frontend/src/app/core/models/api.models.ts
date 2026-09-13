export type StreamStatus = 'online' | 'offline' | 'connecting' | 'error' | 'disabled';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin';
}

export interface Site {
  id: string;
  name: string;
  slug: string;
  description?: string;
  organizationName?: string;
  location?: string;
  isActive: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CameraSourceConfig {
  host: string;
  port: number;
  username: string;
  channel: number;
  subtype: 0 | 1;
  customPath?: string;
}

export interface Camera {
  id: string;
  siteId: string;
  name: string;
  cameraKey: string;
  channelNumber?: number;
  sourceType: 'rtsp' | 'connector' | 'vpn';
  isActive: boolean;
  sortOrder: number;
  lastKnownStatus: StreamStatus;
  lastStatusAt?: string;
  hasPassword: boolean;
  sourceConfig?: CameraSourceConfig;
  createdAt: string;
  updatedAt: string;
}

export interface PublicCamera {
  id: string;
  name: string;
  cameraKey: string;
  isActive: boolean;
  sortOrder: number;
  status: StreamStatus;
}

export interface DashboardStats {
  totalSites: number;
  activeSites: number;
  totalCameras: number;
  onlineCameras: number;
  offlineCameras: number;
}

export interface PlaybackSession {
  cameraKey: string;
  cameraName: string;
  status: StreamStatus;
  whepUrl: string;
  hlsUrl: string;
  expiresAt: string;
}

export interface RtspSourceForm {
  host: string;
  port: number;
  username: string;
  password: string;
  channel: number;
  subtype: 0 | 1;
  customPath?: string;
}
