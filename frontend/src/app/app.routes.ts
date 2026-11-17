import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { learnerGuard } from './core/guards/learner-guard';
import { tutorGuard } from './core/guards/tutor-guard';
import { Login } from './features/auth/login/login';
import { Register } from './features/auth/register/register';
import { LearnerBookings } from './features/bookings/learner-bookings/learner-bookings';
import { TutorSessions } from './features/bookings/tutor-sessions/tutor-sessions';
import { Dashboard } from './features/dashboard/dashboard';
import { NotFound } from './features/not-found/not-found';
import { TutorProfile } from './features/tutor/tutor-profile/tutor-profile';
import { TutorSlots } from './features/tutor/tutor-slots/tutor-slots';
import { TutorDetail } from './features/tutors/tutor-detail/tutor-detail';
import { TutorSearch } from './features/tutors/tutor-search/tutor-search';

// A3 Task 2: Defines public, protected, role-specific, and fallback routes.
export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'login',
    component: Login,
  },
  {
    path: 'register',
    component: Register,
  },
  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [authGuard],
  },
  {
    path: 'tutors',
    component: TutorSearch,
    canActivate: [authGuard],
  },
  {
    path: 'tutors/:userId',
    component: TutorDetail,
    canActivate: [authGuard],
  },
  {
    path: 'my-profile',
    component: TutorProfile,
    canActivate: [authGuard, tutorGuard],
  },
  {
    path: 'my-slots',
    component: TutorSlots,
    canActivate: [authGuard, tutorGuard],
  },
  {
    path: 'my-bookings',
    component: LearnerBookings,
    canActivate: [authGuard, learnerGuard],
  },
  {
    path: 'my-sessions',
    component: TutorSessions,
    canActivate: [authGuard, tutorGuard],
  },
  {
    path: '**',
    component: NotFound,
  },
];
