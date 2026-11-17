import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Service, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

import {
  AuthMeResponse,
  AuthUser,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
} from './auth.models';

import { catchError, finalize, of, switchMap, tap } from 'rxjs';
// A3 Task 1: Manages authentication state and session restoration.
@Service()
export class Auth {

  // A3 HD Task 4: Restores the last authenticated role for offline startup.
private readonly userStorageKey = 'studybridge_user';
  // Provides access to Angular's HTTP client through dependency injection
  private readonly http = inject(HttpClient);

  // Builds the authentication URL from the centralized environment configuration
  private readonly authUrl = `${environment.apiBaseUrl}/auth`;
  // The fixed key used to store the JWT in localStorage
  private readonly storageKey = 'studybridge_token';

  // Restores the token from localStorage so a page refresh does not immediately end the session
  private readonly tokenState = signal<string | null>(
    globalThis.localStorage?.getItem(this.storageKey) ?? null,
  );

  // Stores the current user returned by GET /auth/me
  private readonly userState = signal<AuthUser | null>(
  this.readStoredUser(),
);

  // Indicates whether the initial authentication check has completed
  private readonly initializedState = signal(false);

  // Exposes the token as read-only so components cannot modify authentication state directly
  readonly token = this.tokenState.asReadonly();

  // Exposes the current user information as a read-only signal
  readonly user = this.userState.asReadonly();

  // Allows route guards to wait until the initial authentication check is complete
  readonly initialized = this.initializedState.asReadonly();

  // The user is authenticated only when both the token and user information exist
  readonly isAuthenticated = computed(
    () => this.token() !== null && this.user() !== null,
  );

// Sends registration details to the Assignment 2 backend
  register(request: RegisterRequest) {
    return this.http.post<void>(`${this.authUrl}/register`, request);
  }

    // Loads the current user from the backend and maps _id to the frontend userId
  loadCurrentUser() {
    return this.http.get<AuthMeResponse>(`${this.authUrl}/me`).pipe(
      tap((response) => {
  const user: AuthUser = {
    userId: response._id,
    fullName: response.fullName,
    email: response.email,
    role: response.role,
    createdDate: response.createdDate,
    greeting: response.greeting,
    reliabilityScore: response.reliabilityScore,
  };

  try {
    globalThis.localStorage?.setItem(
      this.userStorageKey,
      JSON.stringify(user),
    );
  } catch {
    // Authentication still works when browser storage is unavailable.
  }

  this.userState.set(user);
}),

      // Marks the initial authentication check as complete on success or failure
      finalize(() => this.initializedState.set(true)),
    );
  }

  // Logs in, stores the JWT, and then loads the authenticated user
  login(request: LoginRequest) {
    return this.http
      .post<LoginResponse>(`${this.authUrl}/login`, request)
      .pipe(
        tap(({ token }) => {
          globalThis.localStorage?.setItem(this.storageKey, token);
          this.tokenState.set(token);
        }),
        switchMap(() => this.loadCurrentUser()),
      );
  }
  // Clears all authentication data stored in the browser
  clearSession(): void {
  globalThis.localStorage?.removeItem(this.storageKey);
  globalThis.localStorage?.removeItem(this.userStorageKey);
  this.tokenState.set(null);
  this.userState.set(null);
  this.initializedState.set(true);
}

  // Calls the backend logout endpoint and always clears the local session
  logout() {
    return this.http
      .post<void>(`${this.authUrl}/logout`, {})
      .pipe(finalize(() => this.clearSession()));
  }

  // Restores the last authenticated user so read-only pages can open offline.
private readStoredUser(): AuthUser | null {
  try {
    const storedUser =
      globalThis.localStorage?.getItem(this.userStorageKey);

    return storedUser
      ? (JSON.parse(storedUser) as AuthUser)
      : null;
  } catch {
    return null;
  }
}
    // Restores the current user when the application starts with a stored token
  initializeSession() {
    if (!this.tokenState()) {
      this.initializedState.set(true);
      return of(null);
    }

    return this.loadCurrentUser().pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          this.clearSession();
        }

        return of(null);
      }),
    );
  }
}
