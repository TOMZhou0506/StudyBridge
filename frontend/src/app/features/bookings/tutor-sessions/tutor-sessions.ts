import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { Observable } from 'rxjs';

import { BookingData } from '../booking-data';
import { SessionBooking } from '../booking.models';

type TutorBookingAction = 'confirm' | 'complete' | 'cancel';

interface RunningBookingAction {
  bookingId: string;
  action: TutorBookingAction;
}

@Component({
  imports: [DatePipe],
  selector: 'app-tutor-sessions',
  styleUrl: './tutor-sessions.scss',
  templateUrl: './tutor-sessions.html',
})
export class TutorSessions implements OnInit {
  // A3 Task 7: Lists tutor sessions and enforces legal status transitions.
  private readonly bookingData = inject(BookingData);

  // Stores bookings returned for the authenticated tutor.
  protected readonly bookings = signal<SessionBooking[]>([]);

  // Tracks the initial booking request.
  protected readonly isLoading = signal(true);

  // Stores an error when the session list cannot be loaded.
  protected readonly loadErrorMessage = signal('');

  // Stores the booking action currently being submitted.
  protected readonly runningAction = signal<RunningBookingAction | null>(null);

  // Stores a backend action error beside its booking.
  protected readonly actionErrors = signal<Record<string, string>>({});

  // Displays successful status changes.
  protected readonly successMessage = signal('');

  // A3 HD Task 5: Manages temporary tutor notes and generated Gemini recaps.
protected readonly recapNotes = signal<Record<string, string>>({});

// Stores generated recaps only while this page remains open.
protected readonly generatedRecaps = signal<Record<string, string>>({});

// Stores recap errors beside the affected booking.
protected readonly recapErrors = signal<Record<string, string>>({});

// Identifies the booking currently generating a recap.
protected readonly generatingRecapFor = signal<string | null>(null);
  // Loads tutor sessions when the page opens.
  ngOnInit(): void {
    this.loadBookings();
  }

  // Confirms a booking only from the requested state.
  protected confirmBooking(booking: SessionBooking): void {
    if (booking.status !== 'requested') {
      return;
    }

    this.runBookingAction(
      booking,
      'confirm',
      this.bookingData.confirmBooking(booking._id),
      'Booking confirmed successfully.',
    );
  }

  // Completes a booking only from the confirmed state.
  protected completeBooking(booking: SessionBooking): void {
    if (booking.status !== 'confirmed') {
      return;
    }

    this.runBookingAction(
      booking,
      'complete',
      this.bookingData.completeBooking(booking._id),
      'Booking completed successfully.',
    );
  }

  // Cancels a booking only from requested or confirmed states.
  protected cancelBooking(booking: SessionBooking): void {
    if (booking.status !== 'requested' && booking.status !== 'confirmed') {
      return;
    }

    this.runBookingAction(
      booking,
      'cancel',
      this.bookingData.cancelBooking(booking._id),
      'Booking cancelled successfully.',
    );
  }
  // Updates temporary notes when the tutor types in a textarea.
protected updateRecapNotes(bookingId: string, event: Event): void {
  const notes = (event.target as HTMLTextAreaElement).value;

  this.recapNotes.update((currentNotes) => ({
    ...currentNotes,
    [bookingId]: notes,
  }));
}
// Requests an AI recap for one completed booking.
protected generateRecap(booking: SessionBooking): void {
  if (booking.status !== 'completed' || this.generatingRecapFor() !== null) {
    return;
  }

  const notes = this.recapNotes()[booking._id]?.trim() ?? '';

  if (!notes) {
    this.recapErrors.update((errors) => ({
      ...errors,
      [booking._id]: 'Tutor notes are required.',
    }));
    return;
  }

  this.generatingRecapFor.set(booking._id);

  this.recapErrors.update((errors) => {
    const updatedErrors = { ...errors };
    delete updatedErrors[booking._id];
    return updatedErrors;
  });

  this.bookingData.generateRecap(booking._id, { notes }).subscribe({
    next: (response) => {
      this.generatedRecaps.update((recaps) => ({
        ...recaps,
        [booking._id]: response.recap,
      }));

      this.generatingRecapFor.set(null);
    },
    error: (error: HttpErrorResponse) => {
      this.recapErrors.update((errors) => ({
        ...errors,
        [booking._id]:
          error.error?.error ?? 'Unable to generate the session recap.',
      }));

      this.generatingRecapFor.set(null);
    },
  });
}
// Checks whether this booking is waiting for Gemini.
protected isGeneratingRecap(bookingId: string): boolean {
  return this.generatingRecapFor() === bookingId;
}

  // Returns whether one specific action is currently running.
  protected isActionRunning(
    bookingId: string,
    action: TutorBookingAction,
  ): boolean {
    const runningAction = this.runningAction();
    return (
      runningAction?.bookingId === bookingId &&
      runningAction.action === action
    );
  }

  // Loads only the bookings returned for the authenticated tutor.
  private loadBookings(): void {
    this.isLoading.set(true);
    this.loadErrorMessage.set('');

    this.bookingData.getMyBookings().subscribe({
      next: (bookings) => {
        this.bookings.set(bookings);
        this.isLoading.set(false);
      },
      error: () => {
        this.bookings.set([]);
        this.loadErrorMessage.set('Unable to load your sessions.');
        this.isLoading.set(false);
      },
    });
  }

  // Submits one legal status action and updates the displayed booking.
  private runBookingAction(
    booking: SessionBooking,
    action: TutorBookingAction,
    request: Observable<SessionBooking>,
    successMessage: string,
  ): void {
    if (this.runningAction() !== null) {
      return;
    }

    this.runningAction.set({ bookingId: booking._id, action });
    this.successMessage.set('');
    this.clearActionError(booking._id);

    request.subscribe({
      next: (updatedBooking) => {
        this.replaceBooking(updatedBooking);
        this.runningAction.set(null);
        this.successMessage.set(successMessage);
      },
      error: (error: HttpErrorResponse) => {
        this.runningAction.set(null);
        this.setActionError(
          booking._id,
          error.error?.error ?? 'Unable to update the booking.',
        );
      },
    });
  }

  // Replaces one booking with the updated response from the backend.
  private replaceBooking(updatedBooking: SessionBooking): void {
    this.bookings.update((bookings) =>
      bookings.map((booking) =>
        booking._id === updatedBooking._id ? updatedBooking : booking,
      ),
    );
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
}
