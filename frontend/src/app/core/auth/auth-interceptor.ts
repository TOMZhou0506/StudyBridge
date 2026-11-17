
import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Auth } from './auth';
import {
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';

import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

// A3 Task 1: Attaches the JWT and handles authenticated 401 responses.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  const router = inject(Router);
  const token = auth.token();

  // Checks whether the request belongs to the Assignment 2 backend
  const isBackendRequest = req.url.startsWith(environment.apiBaseUrl);

  // Login and registration must display their own 401 errors
  const isPublicAuthRequest =
    req.url.startsWith(`${environment.apiBaseUrl}/auth/login`) ||
    req.url.startsWith(`${environment.apiBaseUrl}/auth/register`);

  // Adds the JWT only to requests sent to the Assignment 2 backend
  const requestToSend =
    token && isBackendRequest
      ? req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
          },
        })
      : req;

  return next(requestToSend).pipe(
    catchError((error: HttpErrorResponse) => {
      // An authenticated 401 ends the session, except for login and registration
      if (
        error.status === 401 &&
        isBackendRequest &&
        !isPublicAuthRequest
      ) {
        auth.clearSession();
        void router.navigate(['/login']);
      }

      // Re-throws the error so the calling component can still handle it
      return throwError(() => error);
    }),
  );
};
