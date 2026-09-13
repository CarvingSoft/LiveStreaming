import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  Camera,
  DashboardStats,
  PlaybackSession,
  PublicCamera,
  RtspSourceForm,
  Site,
} from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  private get baseUrl(): string {
    if (typeof window === 'undefined' || environment.production) {
      return environment.apiUrl;
    }

    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:${environment.apiPort}/api`;
  }

  getDashboardStats() {
    return this.http.get<DashboardStats>(`${this.baseUrl}/sites/stats`);
  }

  getSites() {
    return this.http.get<Site[]>(`${this.baseUrl}/sites`);
  }

  getSite(id: string) {
    return this.http.get<Site>(`${this.baseUrl}/sites/${id}`);
  }

  createSite(payload: Partial<Site>) {
    return this.http.post<Site>(`${this.baseUrl}/sites`, payload);
  }

  updateSite(id: string, payload: Partial<Site>) {
    return this.http.put<Site>(`${this.baseUrl}/sites/${id}`, payload);
  }

  deleteSite(id: string) {
    return this.http.delete<void>(`${this.baseUrl}/sites/${id}`);
  }

  getCameras(siteId: string) {
    return this.http.get<Camera[]>(`${this.baseUrl}/cameras/sites/${siteId}/cameras`);
  }

  getCamera(id: string) {
    return this.http.get<Camera>(`${this.baseUrl}/cameras/${id}`);
  }

  createCamera(
    siteId: string,
    payload: {
      name: string;
      cameraKey?: string;
      sourceType?: string;
      sourceConfig?: RtspSourceForm;
      isActive?: boolean;
      sortOrder?: number;
    },
  ) {
    return this.http.post<Camera>(`${this.baseUrl}/cameras/sites/${siteId}/cameras`, payload);
  }

  updateCamera(
    id: string,
    payload: {
      name?: string;
      sourceType?: string;
      sourceConfig?: Partial<RtspSourceForm>;
      isActive?: boolean;
      sortOrder?: number;
    },
  ) {
    return this.http.put<Camera>(`${this.baseUrl}/cameras/${id}`, payload);
  }

  deleteCamera(id: string) {
    return this.http.delete<void>(`${this.baseUrl}/cameras/${id}`);
  }

  getPublicSite(slug: string) {
    return this.http.get<{ site: Site; cameras: PublicCamera[] }>(`${this.baseUrl}/public/sites/${slug}`);
  }

  getPlaybackSession(siteSlug: string, cameraKey: string) {
    return this.http.get<PlaybackSession>(`${this.baseUrl}/playback/${siteSlug}/${cameraKey}`);
  }
}
