import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { Site } from '../../../core/models/api.models';

@Component({
  selector: 'app-sites-list',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="page">
      <header class="toolbar">
        <div>
          <h1>Sites</h1>
          <p>Manage government offices and customer locations.</p>
        </div>
        <a routerLink="/admin/sites/new" class="btn">Create Site</a>
      </header>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Organization</th>
              <th>Status</th>
              <th>Visibility</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (site of sites(); track site.id) {
              <tr>
                <td>{{ site.name }}</td>
                <td><code>/{{ site.slug }}</code></td>
                <td>{{ site.organizationName || '—' }}</td>
                <td>
                  <span [class]="site.isActive ? 'pill ok' : 'pill bad'">
                    {{ site.isActive ? 'Active' : 'Disabled' }}
                  </span>
                </td>
                <td>{{ site.isPublic ? 'Public' : 'Private' }}</td>
                <td class="actions">
                  <a [routerLink]="['/admin/sites', site.id]">Manage</a>
                  <a [routerLink]="['/admin/sites', site.id, 'edit']">Edit</a>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6">No sites yet. Create your first site.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
  styles: `
    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    h1 {
      margin: 0 0 0.35rem;
    }

    p {
      margin: 0;
      color: #64748b;
    }

    .btn {
      background: #2563eb;
      color: white;
      text-decoration: none;
      padding: 0.65rem 0.95rem;
      border-radius: 8px;
      font-weight: 600;
    }

    .table-wrap {
      overflow: auto;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th,
    td {
      padding: 0.85rem 1rem;
      text-align: left;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }

    th {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #64748b;
    }

    .actions {
      display: flex;
      gap: 0.75rem;
    }

    .actions a {
      color: #2563eb;
      text-decoration: none;
      font-weight: 600;
    }

    .pill {
      display: inline-block;
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
    }

    .pill.ok {
      background: #dcfce7;
      color: #166534;
    }

    .pill.bad {
      background: #fee2e2;
      color: #991b1b;
    }
  `,
})
export class SitesListComponent {
  private readonly api = inject(ApiService);
  readonly sites = signal<Site[]>([]);

  constructor() {
    this.loadSites();
  }

  private loadSites(): void {
    this.api.getSites().subscribe({
      next: (sites) => this.sites.set(sites),
    });
  }
}
