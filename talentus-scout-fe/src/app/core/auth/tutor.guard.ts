import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const tutorGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAdmin()) {
    router.navigate(['/admin/scouts']);
    return false;
  }

  if (authService.isScout()) {
    router.navigate(['/scout/directory']);
    return false;
  }

  return true;
};
