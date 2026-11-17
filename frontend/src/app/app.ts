import { Component, inject, signal } from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { finalize } from 'rxjs';

import { Auth } from './core/auth/auth';

@Component({
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  // A3 Task 9: Drives the shared layout, role-based navigation, and logout flow.
  private readonly auth = inject(Auth);

  // Provides navigation after logout.
  private readonly router = inject(Router);

  // Exposes authentication state to the shared application layout.
  protected readonly currentUser = this.auth.user;

  // Exposes whether a user is currently authenticated.
  protected readonly isAuthenticated = this.auth.isAuthenticated;

  // Prevents duplicate logout requests.
  protected readonly isLoggingOut = signal(false);

  // Calls the backend logout endpoint before returning to login.
  protected logout(): void {
    if (this.isLoggingOut()) {
      return;
    }

    this.isLoggingOut.set(true);

    this.auth
      .logout()
      .pipe(
        finalize(() => {
          this.isLoggingOut.set(false);
          void this.router.navigate(['/login']);
        }),
      )
      .subscribe({
        error: () => undefined,
      });
  }
}
