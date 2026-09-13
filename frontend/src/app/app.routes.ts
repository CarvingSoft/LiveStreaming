import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { reservedSlugGuard } from './core/guards/reserved-slug.guard';
import { AdminLayoutComponent } from './shared/admin-layout/admin-layout.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/admin/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'sites',
        loadComponent: () =>
          import('./features/admin/sites/sites-list.component').then((m) => m.SitesListComponent),
      },
      {
        path: 'sites/new',
        loadComponent: () =>
          import('./features/admin/sites/site-form.component').then((m) => m.SiteFormComponent),
      },
      {
        path: 'sites/:id/edit',
        loadComponent: () =>
          import('./features/admin/sites/site-form.component').then((m) => m.SiteFormComponent),
      },
      {
        path: 'sites/:id',
        loadComponent: () =>
          import('./features/admin/sites/site-detail.component').then((m) => m.SiteDetailComponent),
      },
    ],
  },
  {
    path: ':slug',
    canActivate: [reservedSlugGuard],
    loadComponent: () =>
      import('./features/public/live-view/live-view.component').then((m) => m.LiveViewComponent),
  },
  { path: '**', redirectTo: 'login' },
];
