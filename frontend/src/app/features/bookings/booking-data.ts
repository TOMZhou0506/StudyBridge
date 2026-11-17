import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';

import { environment } from '../../../environments/environment';


import {
  BookingReview,
  CreateBookingRequest,
  CreateReviewRequest,
  GenerateRecapRequest,
  GenerateRecapResponse,
  SessionBooking,
} from './booking.models';
// A3 Task 6: Provides the learner booking request and shared booking APIs.
@Service()
export class BookingData {
  // Provides access to Angular's HTTP client.
  private readonly http = inject(HttpClient);

  // Uses the centralized Assignment 2 API base URL.
  private readonly bookingsUrl = `${environment.apiBaseUrl}/bookings`;

  // Reserves an available tutor slot for the authenticated learner.
  createBooking(request: CreateBookingRequest) {
    return this.http.post<SessionBooking>(this.bookingsUrl, request);
  }

  // A3 Task 7: Loads and updates the authenticated user's booking lifecycle.
  getMyBookings() {
    return this.http.get<SessionBooking[]>(`${this.bookingsUrl}/mine`);
  }

  // Confirms a requested booking for the authenticated tutor.
  confirmBooking(bookingId: string) {
    return this.http.patch<SessionBooking>(
      `${this.bookingsUrl}/${bookingId}/confirm`,
      {},
    );
  }

  // Completes a confirmed booking for the authenticated tutor.
  completeBooking(bookingId: string) {
    return this.http.patch<SessionBooking>(
      `${this.bookingsUrl}/${bookingId}/complete`,
      {},
    );
  }

  // Cancels a requested or confirmed booking for either role.
  cancelBooking(bookingId: string) {
    return this.http.patch<SessionBooking>(
      `${this.bookingsUrl}/${bookingId}/cancel`,
      {},
    );
  }

  // A3 Task 8: Submits a learner review for one completed booking.
  submitReview(bookingId: string, request: CreateReviewRequest) {
    return this.http.post<BookingReview>(
      `${this.bookingsUrl}/${bookingId}/review`,
      request,
    );
  }
  // A3 HD Task 5: Sends tutor notes to the protected recap endpoint.
generateRecap(bookingId: string, request: GenerateRecapRequest) {
  return this.http.post<GenerateRecapResponse>(
    `${this.bookingsUrl}/${bookingId}/recap`,
    request,
  );
}
}
