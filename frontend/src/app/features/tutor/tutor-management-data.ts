import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';

import { environment } from '../../../environments/environment';
import { TutorAvailabilitySlot } from '../tutors/tutor.models';
import {
  CreateSlotRequest,
  DeleteSlotResponse,
  TutorProfileRecord,
  TutorProfileRequest,
} from './tutor-management.models';

// A3 Task 5: Provides tutor profile and availability-slot API requests.
@Service()
export class TutorManagementData {
  // Provides access to Angular's HTTP client.
  private readonly http = inject(HttpClient);

  // Uses the centralized Assignment 2 API base URL.
  private readonly apiUrl = environment.apiBaseUrl;

  // Creates the authenticated tutor's first profile.
  createProfile(request: TutorProfileRequest) {
    return this.http.post<TutorProfileRecord>(
      `${this.apiUrl}/tutors/profile`,
      request,
    );
  }

  // Fully replaces the authenticated tutor's existing profile.
  updateProfile(request: TutorProfileRequest) {
    return this.http.put<TutorProfileRecord>(
      `${this.apiUrl}/tutors/profile`,
      request,
    );
  }

  // Loads all availability slots belonging to the authenticated tutor.
  getMySlots() {
    return this.http.get<TutorAvailabilitySlot[]>(
      `${this.apiUrl}/slots/mine`,
    );
  }

  // Publishes a new availability slot.
  createSlot(request: CreateSlotRequest) {
    return this.http.post<TutorAvailabilitySlot>(
      `${this.apiUrl}/slots`,
      request,
    );
  }

  // Deletes one unbooked slot belonging to the authenticated tutor.
  deleteSlot(slotId: string) {
    return this.http.delete<DeleteSlotResponse>(
      `${this.apiUrl}/slots/${slotId}`,
    );
  }
}
