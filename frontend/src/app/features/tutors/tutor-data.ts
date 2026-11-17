
import { inject, Service } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

import {
  TutorDetailResponse,
  TutorSearchFilters,
  TutorSearchResult,
  TutorSubject,
} from './tutor.models';
// A3 Task 4: Provides subject, tutor search, and tutor detail API requests.
@Service()
export class TutorData {
  // Provides access to Angular's HTTP client through dependency injection.
  private readonly http = inject(HttpClient);

  // Uses the centralized Assignment 2 API base URL.
  private readonly apiUrl = environment.apiBaseUrl;
    // Loads the subject options used by the tutor search form.
  getSubjects() {
    return this.http.get<TutorSubject[]>(
      `${this.apiUrl}/subjects`,
    );
  }
    // Searches tutors using only the filters completed by the user.
  searchTutors(filters: TutorSearchFilters) {
    let params = new HttpParams();

    if (filters.subject.trim()) {
      params = params.set('subject', filters.subject.trim());
    }

    if (filters.minPrice !== null) {
      params = params.set('minPrice', filters.minPrice.toString());
    }

    if (filters.maxPrice !== null) {
      params = params.set('maxPrice', filters.maxPrice.toString());
    }

    if (filters.minRating !== null) {
      params = params.set('minRating', filters.minRating.toString());
    }

    if (filters.availableThisWeek) {
      params = params.set('availableThisWeek', 'true');
    }

    return this.http.get<TutorSearchResult[]>(
      `${this.apiUrl}/tutors/search`,
      { params },
    );
  }  
  // Loads one tutor's profile, open slots, and reviews.
  getTutor(userId: string) {
    return this.http.get<TutorDetailResponse>(
      `${this.apiUrl}/tutors/${userId}`,
    );
  }
}
