import { Injectable } from '@angular/core';

import { SessionBooking } from '../../features/bookings/booking.models';
import {
  TutorSearchFilters,
  TutorSearchResult,
  TutorSubject,
} from '../../features/tutors/tutor.models';

export interface OfflineSnapshot<T> {
  data: T;
  fetchedAt: string;
}

export interface CachedLearnerBookings {
  bookings: SessionBooking[];
  tutorNames: Record<string, string>;
  subjectNames: Record<string, string>;
}

export interface CachedTutorSearch {
  tutors: TutorSearchResult[];
  subjects: TutorSubject[];
  filters: TutorSearchFilters;
}

@Injectable({
  providedIn: 'root',
})
// A3 HD Task 4: Stores timestamped snapshots for read-only offline access.
export class OfflineCache {
  private readonly bookingKeyPrefix =
    'studybridge_offline_learner_bookings';

  private readonly tutorSearchKey =
    'studybridge_offline_tutor_search';

  // Stores one learner's latest booking data separately from other users.
  saveLearnerBookings(
    userId: string,
    data: CachedLearnerBookings,
  ): void {
    this.write(`${this.bookingKeyPrefix}_${userId}`, data);
  }

  // Returns the latest cached booking data for one learner.
  getLearnerBookings(
    userId: string,
  ): OfflineSnapshot<CachedLearnerBookings> | null {
    return this.read<CachedLearnerBookings>(
      `${this.bookingKeyPrefix}_${userId}`,
    );
  }

  // Stores the latest successful tutor search and subject catalogue.
  saveTutorSearch(data: CachedTutorSearch): void {
    this.write(this.tutorSearchKey, data);
  }

  // Returns the latest cached tutor search.
  getTutorSearch(): OfflineSnapshot<CachedTutorSearch> | null {
    return this.read<CachedTutorSearch>(this.tutorSearchKey);
  }

  // Writes data together with the time it was successfully fetched.
  private write<T>(key: string, data: T): void {
    const snapshot: OfflineSnapshot<T> = {
      data,
      fetchedAt: new Date().toISOString(),
    };

    try {
      globalThis.localStorage?.setItem(
        key,
        JSON.stringify(snapshot),
      );
    } catch {
      // The application can continue when browser storage is unavailable.
    }
  }

  // Reads and validates one cached value from browser storage.
  private read<T>(key: string): OfflineSnapshot<T> | null {
    try {
      const storedValue = globalThis.localStorage?.getItem(key);

      if (!storedValue) {
        return null;
      }

      const snapshot = JSON.parse(storedValue) as unknown;

      if (
        typeof snapshot !== 'object' ||
        snapshot === null ||
        !('data' in snapshot) ||
        !('fetchedAt' in snapshot) ||
        typeof snapshot.fetchedAt !== 'string'
      ) {
        return null;
      }

      return snapshot as OfflineSnapshot<T>;
    } catch {
      return null;
    }
  }
}
