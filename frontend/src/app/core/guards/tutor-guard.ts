import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../auth/auth';

// A3 Task 2: Restricts tutor-only routes to authenticated tutors.
export const tutorGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  // Sends authenticated users with the wrong role back to the dashboard
  return auth.user()?.role === 'tutor'
    ? true
    : router.createUrlTree(['/dashboard']);
};
