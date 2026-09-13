import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { PublicCamera, Site } from '../../../core/models/api.models';
import { CameraPlayerComponent } from '../../../shared/camera-player/camera-player.component';
import { StatusBadgeComponent } from '../../../shared/status-badge/status-badge.component';

@Component({
  selector: 'app-live-view',
  standalone: true,
  imports: [CameraPlayerComponent, StatusBadgeComponent],
  template: `
    <div class="live-page">
      @if (loading()) {
        <div class="center">Loading live site...</div>
      } @else if (error()) {
        <div class="center error">{{ error() }}</div>
      } @else if (site()) {
        <header class="hero">
          <div>
            <p class="eyebrow">Carvingsoft Live</p>
            <h1>{{ site()!.name }}</h1>
            @if (site()!.organizationName) {
              <p class="org">{{ site()!.organizationName }}</p>
            }
            @if (site()!.location) {
              <p class="location">{{ site()!.location }}</p>
            }
          </div>
          <app-status-badge [status]="overallStatus()" />
        </header>

        @if (cameras().length === 0) {
          <div class="center">No active cameras are configured for this site.</div>
        } @else {
          <div class="camera-grid">
            @for (camera of cameras(); track camera.id) {
              <app-camera-player
                [siteSlug]="site()!.slug"
                [cameraKey]="camera.cameraKey"
                [cameraName]="camera.name"
              />
            }
          </div>
        }
      }
    </div>
  `,
  styles: `
    .live-page {
      min-height: 100vh;
      background: #020617;
      color: #f8fafc;
      padding: 1.25rem;
    }

    .hero {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      margin-bottom: 1.25rem;
      padding: 1rem 0;
      border-bottom: 1px solid #1e293b;
    }

    .eyebrow {
      margin: 0 0 0.35rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-size: 0.75rem;
      color: #64748b;
    }

    h1 {
      margin: 0;
      font-size: clamp(1.5rem, 3vw, 2.2rem);
    }

    .org,
    .location {
      margin: 0.35rem 0 0;
      color: #94a3b8;
    }

    .camera-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 1rem;
    }

    .center {
      display: grid;
      place-items: center;
      min-height: 40vh;
      color: #94a3b8;
    }

    .center.error {
      color: #fecaca;
    }

    @media (max-width: 1024px) {
      .camera-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 640px) {
      .camera-grid {
        grid-template-columns: 1fr;
      }

      .hero {
        flex-direction: column;
      }
    }
  `,
})
export class LiveViewComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);

  readonly site = signal<Site | null>(null);
  readonly cameras = signal<PublicCamera[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly overallStatus = signal<'online' | 'offline' | 'connecting' | 'error' | 'disabled'>('offline');

  constructor() {
    const slug = this.route.snapshot.paramMap.get('slug')!;
    this.api.getPublicSite(slug).subscribe({
      next: ({ site, cameras }) => {
        this.site.set(site);
        this.cameras.set(cameras);
        this.overallStatus.set(
          cameras.some((camera) => camera.status === 'online') ? 'online' : 'offline',
        );
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        const message = err.error?.message ?? err.message ?? 'Unable to load this live site.';
        this.error.set(
          err.status === 0
            ? 'Unable to reach the API. Use the same PC IP for frontend and ensure the backend is running on port 5280.'
            : message,
        );
      },
    });
  }
}
