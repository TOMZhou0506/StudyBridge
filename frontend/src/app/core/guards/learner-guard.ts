import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../auth/auth';

// A3 Task 2: Restricts learner-only routes to authenticated learners.
export const learnerGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  // Sends authenticated users with the wrong role back to the dashboard
  return auth.user()?.role === 'learner'
    ? true
    : router.createUrlTree(['/dashboard']);
};
