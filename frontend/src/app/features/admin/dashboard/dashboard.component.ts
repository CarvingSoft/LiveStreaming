import { Component, inject, signal } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { DashboardStats } from '../../../core/models/api.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `
    <section class="page">
      <header>
        <h1>Dashboard</h1>
        <p>Live streaming overview across all sites.</p>
      </header>

      <div class="stats-grid">
        <article class="stat-card">
          <span>Total Sites</span>
          <strong>{{ stats()?.totalSites ?? 0 }}</strong>
        </article>
        <article class="stat-card">
          <span>Active Sites</span>
          <strong>{{ stats()?.activeSites ?? 0 }}</strong>
        </article>
        <article class="stat-card">
          <span>Total Cameras</span>
          <strong>{{ stats()?.totalCameras ?? 0 }}</strong>
        </article>
        <article class="stat-card online">
          <span>Online Cameras</span>
          <strong>{{ stats()?.onlineCameras ?? 0 }}</strong>
        </article>
        <article class="stat-card offline">
          <span>Offline Cameras</span>
          <strong>{{ stats()?.offlineCameras ?? 0 }}</strong>
        </article>
      </div>
    </section>
  `,
  styles: `
    .page header {
      margin-bottom: 1.5rem;
    }

    h1 {
      margin: 0 0 0.35rem;
    }

    p {
      margin: 0;
      color: #64748b;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
    }

    .stat-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 1rem 1.1rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .stat-card span {
      color: #64748b;
      font-size: 0.9rem;
    }

    .stat-card strong {
      font-size: 1.8rem;
      line-height: 1;
    }

    .stat-card.online strong {
      color: #15803d;
    }

    .stat-card.offline strong {
      color: #b91c1c;
    }
  `,
})
export class DashboardComponent {
  private readonly api = inject(ApiService);
  readonly stats = signal<DashboardStats | null>(null);

  constructor() {
    this.api.getDashboardStats().subscribe({
      next: (stats) => this.stats.set(stats),
    });
  }
}
