
import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { Auth } from '../../../core/auth/auth';
import {
  ActivatedRoute,
  Router,
  RouterLink,
} from '@angular/router';

// A3 Task 1: Implements the reactive login form and authentication flow.
@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-login',
  styleUrl: './login.scss',
  templateUrl: './login.html',
})
export class Login {  // Builds strongly typed reactive forms without nullable control values
  // Provides authentication operations and Angular navigation
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  
  private readonly formBuilder = inject(FormBuilder);

  // Stores the login form fields and their client-side validation rules
  readonly loginForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  // Stores the backend error displayed by the login page
  readonly errorMessage = signal('');

  // Prevents repeated submissions while the login request is running
  readonly submitting = signal(false);
  // Validates the form, submits the credentials, and handles the result
  onSubmit(): void {
    if (this.loginForm.invalid || this.submitting()) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.errorMessage.set('');
    this.submitting.set(true);

    this.auth
      .login(this.loginForm.getRawValue())
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          void this.router.navigate(['/dashboard']);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            error.error?.error ?? 'Unable to log in. Please try again.',
          );
        },
      });
  }

  // Reads navigation information such as the registration success query parameter
  private readonly route = inject(ActivatedRoute);

  // Displays confirmation after a successful registration
  readonly confirmationMessage = signal(
    this.route.snapshot.queryParamMap.get('registered') === 'true'
      ? 'Registration successful. Please log in.'
      : '',
  );
}


