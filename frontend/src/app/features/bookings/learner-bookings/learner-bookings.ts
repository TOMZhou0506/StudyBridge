import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { fromEvent } from 'rxjs';

import { Auth } from '../../../core/auth/auth';
import { OfflineCache } from '../../../core/offline/offline-cache';
import { BookingData } from '../booking-data';
import {
  BookingReview,
  CreateReviewRequest,
  SessionBooking,
} from '../booking.models';
import { TutorData } from '../../tutors/tutor-data';

interface ReviewFormControls {
  rating: FormControl<number | null>;
  comment: FormControl<string>;
}

@Component({
  imports: [DatePipe, ReactiveFormsModule],
  selector: 'app-learner-bookings',
  styleUrl: './learner-bookings.scss',
  templateUrl: './learner-bookings.html',
})
export class LearnerBookings implements OnInit {
  // A3 Task 7: Lists learner bookings and allows legal cancellations.
  private readonly bookingData = inject(BookingData);

  // Loads tutor and subject names used by the booking cards.
  private readonly tutorData = inject(TutorData);

  // Identifies the learner whose private booking cache is being used.
  private readonly auth = inject(Auth);

  // A3 HD Task 4: Restores this learner's cached bookings while offline.
  private readonly offlineCache = inject(OfflineCache);

  // Automatically removes browser event subscriptions with the component.
  private readonly destroyRef = inject(DestroyRef);

  // Indicates whether the browser currently reports no network connection.
  protected readonly isOffline = signal(
    globalThis.navigator?.onLine === false,
  );

  // Stores the time associated with the displayed offline snapshot.
  protected readonly offlineFetchedAt = signal<string | null>(null);

  // Prevents reference requests from replacing an older cache before
  // the current booking request has succeeded.
  private hasLoadedBookingsFromNetwork = false;

  // Stores bookings returned for the authenticated learner.
  protected readonly bookings = signal<SessionBooking[]>([]);

  // Maps each tutor user ID to a readable tutor name.
  protected readonly tutorNames = signal<Record<string, string>>({});

  // Maps each subject ID to a readable subject name.
  protected readonly subjectNames = signal<Record<string, string>>({});

  // Tracks the initial booking request.
  protected readonly isLoading = signal(true);

  // Stores an error when the booking list cannot be loaded.
  protected readonly loadErrorMessage = signal('');

  // Stores the booking currently being cancelled.
  protected readonly actionBookingId = signal<string | null>(null);

  // Stores a cancellation error beside its booking.
  protected readonly actionErrors = signal<Record<string, string>>({});

  // Displays booking and cancellation confirmations.
  protected readonly successMessage = signal('');

  // A3 Task 8: Manages validated review forms and duplicate-review responses.
  protected readonly reviewForms = new Map<
    string,
    FormGroup<ReviewFormControls>
  >();

  // Stores reviews submitted during the current page session.
  protected readonly submittedReviews = signal<
    Record<string, BookingReview>
  >({});

  // Stores the booking whose review request is running.
  protected readonly reviewActionBookingId = signal<string | null>(null);

  // Stores review submission errors beside each booking.
  protected readonly reviewErrors = signal<Record<string, string>>({});

  // Records 409 messages and prevents a second review form.
  protected readonly reviewedBookingMessages = signal<
    Record<string, string>
  >({});

  // Loads learner bookings when the page opens.
  ngOnInit(): void {
    const navigationState = history.state as {
      successMessage?: unknown;
    };

    if (typeof navigationState?.successMessage === 'string') {
      this.successMessage.set(navigationState.successMessage);
    }

    this.monitorConnection();

    if (this.isOffline()) {
      this.loadCachedBookings();
      return;
    }

    this.loadBookings();
    this.loadReferenceNames();
  }

  // Returns whether the learner may cancel the booking.
  protected canCancel(booking: SessionBooking): boolean {
    return (
      !this.isOffline() &&
      (booking.status === 'requested' ||
        booking.status === 'confirmed')
    );
  }

  // Cancels the booking and immediately updates its displayed status.
  protected cancelBooking(booking: SessionBooking): void {
    if (!this.canCancel(booking) || this.actionBookingId() !== null) {
      return;
    }

    this.actionBookingId.set(booking._id);
    this.successMessage.set('');
    this.clearActionError(booking._id);

    this.bookingData.cancelBooking(booking._id).subscribe({
      next: (updatedBooking) => {
        this.replaceBooking(updatedBooking);
        this.saveBookingsToCache();
        this.actionBookingId.set(null);
        this.successMessage.set('Booking cancelled successfully.');
      },
      error: (error: HttpErrorResponse) => {
        this.actionBookingId.set(null);
        this.setActionError(
          booking._id,
          error.error?.error ?? 'Unable to cancel the booking.',
        );
      },
    });
  }

  // Returns the reactive form for one completed booking.
  protected getReviewForm(
    bookingId: string,
  ): FormGroup<ReviewFormControls> | undefined {
    return this.reviewForms.get(bookingId);
  }

  // Submits a valid review for one completed booking.
  protected submitReview(booking: SessionBooking): void {
    const form = this.reviewForms.get(booking._id);

    if (
      this.isOffline() ||
      booking.status !== 'completed' ||
      !form ||
      this.reviewActionBookingId() !== null
    ) {
      return;
    }

    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }

    const rating = form.controls.rating.value;

    if (rating === null) {
      return;
    }

    const comment = form.controls.comment.value.trim();
    const request: CreateReviewRequest = {
      rating,
      ...(comment ? { comment } : {}),
    };

    this.reviewActionBookingId.set(booking._id);
    this.clearReviewError(booking._id);

    this.bookingData.submitReview(booking._id, request).subscribe({
      next: (review) => {
        this.submittedReviews.update((reviews) => ({
          ...reviews,
          [booking._id]: review,
        }));
        this.reviewActionBookingId.set(null);
      },
      error: (error: HttpErrorResponse) => {
        const message =
          error.error?.error ?? 'Unable to submit the review.';

        this.reviewActionBookingId.set(null);

        if (error.status === 409) {
          this.reviewedBookingMessages.update((messages) => ({
            ...messages,
            [booking._id]: message,
          }));
          return;
        }

        this.reviewErrors.update((errors) => ({
          ...errors,
          [booking._id]: message,
        }));
      },
    });
  }

  // Loads readable tutor and subject names for the booking cards.
private loadReferenceNames(): void {
  this.tutorData.getSubjects().subscribe({
    next: (subjects) => {
      this.subjectNames.set(
        Object.fromEntries(
          subjects.map((subject) => [
            subject._id,
            subject.name,
          ]),
        ),
      );
      this.saveBookingsToCache();
    },
    error: () => {
      this.subjectNames.set({});
    },
  });

  this.tutorData
    .searchTutors({
      subject: '',
      minPrice: null,
      maxPrice: null,
      minRating: null,
      availableThisWeek: false,
    })
    .subscribe({
      next: (tutors) => {
        this.tutorNames.set(
          Object.fromEntries(
            tutors.map((tutor) => [
              tutor.userId,
              tutor.fullName,
            ]),
          ),
        );
        this.saveBookingsToCache();
      },
      error: () => {
        this.tutorNames.set({});
      },
    });
}
  // Loads only the bookings returned for the authenticated user.
  private loadBookings(): void {
    if (globalThis.navigator?.onLine === false) {
      this.isOffline.set(true);
      this.loadCachedBookings();
      return;
    }

    this.isLoading.set(true);
    this.loadErrorMessage.set('');

    this.bookingData.getMyBookings().subscribe({
      next: (bookings) => {
        this.hasLoadedBookingsFromNetwork = true;
        this.isOffline.set(false);
        this.offlineFetchedAt.set(null);
        this.createReviewForms(bookings);
        this.bookings.set(bookings);
        this.isLoading.set(false);
        this.saveBookingsToCache();
      },
      error: () => {
        if (
          globalThis.navigator?.onLine === false &&
          this.loadCachedBookings()
        ) {
          return;
        }

        this.bookings.set([]);
        this.loadErrorMessage.set('Unable to load your bookings.');
        this.isLoading.set(false);
      },
    });
  }

  // Creates a validated form for each completed booking.
  private createReviewForms(bookings: SessionBooking[]): void {
    for (const booking of bookings) {
      if (
        booking.status !== 'completed' ||
        this.reviewForms.has(booking._id)
      ) {
        continue;
      }

      this.reviewForms.set(
        booking._id,
        new FormGroup<ReviewFormControls>({
          rating: new FormControl<number | null>(null, {
            validators: [
              Validators.required,
              Validators.min(1),
              Validators.max(5),
            ],
          }),
          comment: new FormControl('', {
            nonNullable: true,
            validators: [Validators.maxLength(500)],
          }),
        }),
      );
    }
  }

  // Replaces one booking with the updated response from the backend.
  private replaceBooking(updatedBooking: SessionBooking): void {
    this.bookings.update((bookings) =>
      bookings.map((booking) =>
        booking._id === updatedBooking._id ? updatedBooking : booking,
      ),
    );
  }

  // Restores the latest private booking snapshot for the current learner.
  private loadCachedBookings(): boolean {
    const userId = this.auth.user()?.userId;

    if (!userId) {
      this.bookings.set([]);
      this.loadErrorMessage.set(
        'Offline booking data is unavailable for this user.',
      );
      this.isLoading.set(false);
      return false;
    }

    const snapshot = this.offlineCache.getLearnerBookings(userId);

    if (!snapshot) {
      this.bookings.set([]);
      this.loadErrorMessage.set(
        'You are offline and no saved booking data is available.',
      );
      this.isLoading.set(false);
      return false;
    }

    this.bookings.set(snapshot.data.bookings);
    this.tutorNames.set(snapshot.data.tutorNames);
    this.subjectNames.set(snapshot.data.subjectNames);
    this.createReviewForms(snapshot.data.bookings);
    this.offlineFetchedAt.set(snapshot.fetchedAt);
    this.loadErrorMessage.set('');
    this.isLoading.set(false);

    return true;
  }

  // Saves the latest complete booking view for the current learner.
  private saveBookingsToCache(): void {
    if (!this.hasLoadedBookingsFromNetwork) {
      return;
    }

    const userId = this.auth.user()?.userId;

    if (!userId) {
      return;
    }

    const previous = this.offlineCache.getLearnerBookings(userId);

    const tutorNames =
      Object.keys(this.tutorNames()).length > 0
        ? this.tutorNames()
        : previous?.data.tutorNames ?? {};

    const subjectNames =
      Object.keys(this.subjectNames()).length > 0
        ? this.subjectNames()
        : previous?.data.subjectNames ?? {};

    this.offlineCache.saveLearnerBookings(userId, {
      bookings: this.bookings(),
      tutorNames,
      subjectNames,
    });
  }

  // Refreshes cached data automatically when the connection returns.
  private monitorConnection(): void {
    fromEvent(window, 'offline')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.isOffline.set(true);
        this.loadCachedBookings();
      });

    fromEvent(window, 'online')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.isOffline.set(false);
        this.loadBookings();
        this.loadReferenceNames();
      });
  }

  // Removes an old action error before retrying the booking action.
  private clearActionError(bookingId: string): void {
    this.actionErrors.update((errors) => {
      const updatedErrors = { ...errors };
      delete updatedErrors[bookingId];
      return updatedErrors;
    });
  }

  // Stores a backend error against the affected booking.
  private setActionError(bookingId: string, message: string): void {
    this.actionErrors.update((errors) => ({
      ...errors,
      [bookingId]: message,
    }));
  }

  // Removes an old review error before another submission attempt.
  private clearReviewError(bookingId: string): void {
    this.reviewErrors.update((errors) => {
      const updatedErrors = { ...errors };
      delete updatedErrors[bookingId];
      return updatedErrors;
    });
  }
}
