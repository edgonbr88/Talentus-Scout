import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const scoutGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated() && authService.canAccessDirectory()) {
    return true;
  }

  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
  } else if (authService.isScout()) {
    router.navigate(['/auth/scout-pending-audit']);
  } else {
    router.navigate(['/dashboard']);
  }
  return false;
};
