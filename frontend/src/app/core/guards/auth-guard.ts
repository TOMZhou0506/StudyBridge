import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../auth/auth';

// A3 Task 2: Prevents logged-out users from opening protected routes.
export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  // Allows navigation only after a valid token and user have been restored
  return auth.isAuthenticated()
    ? true
    : router.createUrlTree(['/login']);
};
