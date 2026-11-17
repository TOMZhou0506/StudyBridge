import { HttpErrorResponse } from '@angular/common/http';

import { finalize } from 'rxjs';
import { Auth } from '../../../core/auth/auth';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
// Checks whether the password and confirmation fields contain the same value
const passwordsMatchValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  return password === confirmPassword
    ? null
    : { passwordMismatch: true };
};

// A3 Task 1: Implements registration, validation, and login redirection.
@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-register',
  styleUrl: './register.scss',
  templateUrl: './register.html',
})
export class Register {

    // Provides authentication operations and Angular navigation
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
    // Builds strongly typed reactive forms without nullable control values
  private readonly formBuilder = inject(FormBuilder);

  // Requires uppercase, lowercase, number, and special characters
  private readonly passwordPattern =
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

  // Stores registration fields and mirrors the Assignment 2 validation rules
  readonly registerForm = this.formBuilder.nonNullable.group({
    fullName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: [
      '',
      [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(this.passwordPattern),
      ],
    ],
    confirmPassword: ['', Validators.required],
    role: ['learner' as 'learner' | 'tutor', Validators.required],
  },
  {
    validators: passwordsMatchValidator,
  });

  // Stores backend validation errors such as duplicate email
  readonly errorMessage = signal('');

  // Prevents repeated submissions while registration is running
  readonly submitting = signal(false);
    // Validates the form, registers the user, and redirects to login
  onSubmit(): void {
    if (this.registerForm.invalid || this.submitting()) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.errorMessage.set('');
    this.submitting.set(true);

    const formValue = this.registerForm.getRawValue();

// Sends only the fields accepted by the Assignment 2 registration endpoint
const request = {
  fullName: formValue.fullName,
  email: formValue.email,
  password: formValue.password,
  role: formValue.role,
};

this.auth
  .register(request)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          void this.router.navigate(['/login'], {
            queryParams: {
              registered: 'true',
            },
          });
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            error.error?.error ?? 'Unable to register. Please try again.',
          );
        },
      });
  }
}
