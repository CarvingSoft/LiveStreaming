import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

const RESERVED = new Set(['login', 'admin', 'api', 'assets', 'health', 'stream']);

export const reservedSlugGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const slug = route.paramMap.get('slug') ?? '';

  if (RESERVED.has(slug.toLowerCase())) {
    return router.createUrlTree(['/login']);
  }

  return true;
};
