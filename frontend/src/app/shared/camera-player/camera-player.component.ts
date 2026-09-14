import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import Hls from 'hls.js';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiService } from '../../core/services/api.service';
import { WhepPlayer } from '../../core/services/whep-player.service';
import { StreamStatus } from '../../core/models/api.models';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';

@Component({
  selector: 'app-camera-player',
  standalone: true,
  imports: [StatusBadgeComponent],
  template: `
    <div class="player-card">
      <div class="player-header">
        <h3>{{ cameraName }}</h3>
        <app-status-badge [status]="status()" />
      </div>

      <div class="video-shell">
        @if (status() === 'offline' || status() === 'disabled') {
          <div class="overlay">Camera is currently offline.</div>
        } @else if (status() === 'connecting') {
          <div class="overlay">Connecting to live stream...</div>
        } @else if (status() === 'error') {
          <div class="overlay error">
            {{ errorMessage() }}
            <button type="button" (click)="retry()">Retry</button>
          </div>
        }

        <video #videoEl autoplay playsinline muted controls></video>
      </div>
    </div>
  `,
  styles: `
    .player-card {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 12px;
      overflow: hidden;
      color: #f9fafb;
    }

    .player-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
      padding: 0.85rem 1rem;
      background: #0f172a;
    }

    .player-header h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
    }

    .video-shell {
      position: relative;
      aspect-ratio: 16 / 9;
      background: #000;
    }

    video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      background: #000;
    }

    .overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 1rem;
      text-align: center;
      background: rgba(0, 0, 0, 0.72);
      z-index: 2;
      font-size: 0.95rem;
    }

    .overlay.error {
      color: #fecaca;
    }

    button {
      border: 0;
      border-radius: 8px;
      padding: 0.5rem 0.9rem;
      background: #2563eb;
      color: white;
      cursor: pointer;
      font-weight: 600;
    }
  `,
})
export class CameraPlayerComponent implements AfterViewInit, OnDestroy {
  @Input({ required: true }) siteSlug!: string;
  @Input({ required: true }) cameraKey!: string;
  @Input({ required: true }) cameraName!: string;

  @ViewChild('videoEl') videoRef!: ElementRef<HTMLVideoElement>;

  private readonly api = inject(ApiService);
  private whepPlayer: WhepPlayer | null = null;
  private hls: Hls | null = null;

  readonly status = signal<StreamStatus>('connecting');
  readonly errorMessage = signal(
    'Unable to reach the camera DVR. Check IP, RTSP port (usually 554), and credentials.',
  );

  ngOnDestroy(): void {
    this.cleanup();
  }

  async ngAfterViewInit(): Promise<void> {
    await this.startPlayback();
  }

  retry(): void {
    void this.startPlayback();
  }

  private async startPlayback(): Promise<void> {
    this.cleanup();
    this.status.set('connecting');

    try {
      const session = await firstValueFrom(
        this.api.getPlaybackSession(this.siteSlug, this.cameraKey),
      );
      if (!session) {
        this.status.set('error');
        return;
      }

      if (session.status === 'disabled') {
        this.status.set('disabled');
        return;
      }

      this.status.set(session.status === 'online' ? 'online' : 'connecting');

      const video = this.videoRef.nativeElement;

      // Production: HLS via API proxy — WebRTC ICE cannot reach MediaMTX on EC2 from browsers
      if (environment.production) {
        try {
          await this.startHlsFallback(session.hlsUrl, video);
        } catch {
          this.status.set('offline');
        }
        return;
      }

      try {
        this.whepPlayer = new WhepPlayer({
          whepUrl: session.whepUrl,
          videoElement: video,
          onStatusChange: (state) => {
            if (state === 'online') this.status.set('online');
            if (state === 'error') this.status.set('error');
            if (state === 'connecting') this.status.set('connecting');
          },
        });
        await this.whepPlayer.start();
      } catch {
        try {
          await this.startHlsFallback(session.hlsUrl, video);
        } catch {
          this.status.set('offline');
        }
      }
    } catch {
      this.status.set('error');
    }
  }

  private async startHlsFallback(hlsUrl: string, video: HTMLVideoElement): Promise<void> {
    if (Hls.isSupported()) {
      await new Promise<void>((resolve, reject) => {
        this.hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          manifestLoadingTimeOut: 20_000,
          manifestLoadingMaxRetry: 6,
          levelLoadingTimeOut: 20_000,
          levelLoadingMaxRetry: 6,
          fragLoadingTimeOut: 20_000,
          fragLoadingMaxRetry: 6,
        });
        this.hls.loadSource(hlsUrl);
        this.hls.attachMedia(video);
        this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
          void video.play().catch(() => undefined);
          this.status.set('online');
          resolve();
        });
        this.hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            reject(new Error('HLS playback failed'));
          }
        });
      });
      return;
    }

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      await new Promise<void>((resolve, reject) => {
        video.src = hlsUrl;
        video.addEventListener('loadedmetadata', () => {
          void video.play().catch(() => undefined);
          this.status.set('online');
          resolve();
        });
        video.addEventListener('error', () => reject(new Error('HLS playback failed')), { once: true });
      });
      return;
    }

    throw new Error('HLS is not supported in this browser');
  }

  private cleanup(): void {
    this.whepPlayer?.close();
    this.whepPlayer = null;

    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }

    if (this.videoRef?.nativeElement) {
      this.videoRef.nativeElement.srcObject = null;
      this.videoRef.nativeElement.removeAttribute('src');
    }
  }
}
