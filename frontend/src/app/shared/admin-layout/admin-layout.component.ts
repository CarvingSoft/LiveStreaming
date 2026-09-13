import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="layout">
      <aside class="sidebar">
        <div class="brand">
          <strong>Carvingsoft</strong>
          <span>CCTV Live</span>
        </div>
        <nav>
          <a routerLink="/admin" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Dashboard</a>
          <a routerLink="/admin/sites" routerLinkActive="active">Sites</a>
        </nav>
        <button type="button" class="logout" (click)="logout()">Logout</button>
      </aside>
      <main>
        <router-outlet />
      </main>
    </div>
  `,
  styles: `
    .layout {
      display: grid;
      grid-template-columns: 240px 1fr;
      min-height: 100vh;
      background: #f3f4f6;
    }

    .sidebar {
      background: #0f172a;
      color: #e5e7eb;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .brand {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .brand strong {
      font-size: 1.1rem;
    }

    .brand span {
      color: #94a3b8;
      font-size: 0.85rem;
    }

    nav {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    nav a {
      color: #cbd5e1;
      text-decoration: none;
      padding: 0.65rem 0.75rem;
      border-radius: 8px;
    }

    nav a.active,
    nav a:hover {
      background: #1e293b;
      color: #fff;
    }

    .logout {
      margin-top: auto;
      border: 1px solid #334155;
      background: transparent;
      color: #e2e8f0;
      border-radius: 8px;
      padding: 0.65rem 0.75rem;
      cursor: pointer;
    }

    main {
      padding: 1.5rem;
    }

    @media (max-width: 900px) {
      .layout {
        grid-template-columns: 1fr;
      }

      .sidebar {
        flex-direction: row;
        align-items: center;
        flex-wrap: wrap;
      }

      nav {
        flex-direction: row;
      }

      .logout {
        margin-top: 0;
        margin-left: auto;
      }
    }
  `,
})
export class AdminLayoutComponent {
  private readonly auth = inject(AuthService);

  logout(): void {
    this.auth.logout();
  }
}
