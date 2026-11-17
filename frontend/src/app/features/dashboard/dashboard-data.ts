import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { environment } from '../../../environments/environment';
import {
  AdminAnalytics,
  DashboardBooking,
  DashboardSlot,
  DashboardSubject,
} from './dashboard.models';
// A3 Task 3: Provides the API data required by each dashboard role.
@Service()
export class DashboardData {
  // Provides access to Angular's HTTP client through dependency injection.
  private readonly http = inject(HttpClient);

  // Uses the centralized Assignment 2 API base URL.
  private readonly apiUrl = environment.apiBaseUrl;
    // Loads the current learner's or tutor's bookings.
  getMyBookings() {
    return this.http.get<DashboardBooking[]>(
      `${this.apiUrl}/bookings/mine`,
    );
  }
    // Loads the current tutor's availability slots.
  getMySlots() {
    return this.http.get<DashboardSlot[]>(
      `${this.apiUrl}/slots/mine`,
    );
  }
    // Loads the subject catalogue for the admin dashboard.
  getSubjects() {
    return this.http.get<DashboardSubject[]>(
      `${this.apiUrl}/subjects`,
    );
  }
    // Loads the Assignment 2 HD analytics for the admin dashboard.
  getAdminAnalytics() {
    return this.http.get<AdminAnalytics>(
      `${this.apiUrl}/admin/analytics`,
    );
  }
}
