
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';

import { OfflineCache } from '../../../core/offline/offline-cache';
import { TutorData } from '../tutor-data';
import { TutorAvatar } from '../../../shared/tutor-avatar/tutor-avatar';
import {
  TutorSearchResult,
  TutorSubject,
} from '../tutor.models';

// A3 Task 4: Implements the optional tutor filters and search results page.
@Component({
  imports: [DatePipe, DecimalPipe, ReactiveFormsModule, RouterLink, TutorAvatar],
  selector: 'app-tutor-search',
  styleUrl: './tutor-search.scss',
  templateUrl: './tutor-search.html',
})
export class TutorSearch implements OnInit  {
  // Provides subject and tutor search API requests.
  private readonly tutorData = inject(TutorData);

  // A3 HD Task 4: Restores the latest successful tutor search while offline.
  private readonly offlineCache = inject(OfflineCache);

  // Automatically removes browser event subscriptions with the component.
  private readonly destroyRef = inject(DestroyRef);

  // Indicates whether the browser currently reports no connection.
  protected readonly isOffline = signal(
    globalThis.navigator?.onLine === false,
  );

  // Stores the time associated with the displayed offline search.
  protected readonly offlineFetchedAt = signal<string | null>(null);

  // Stores the subjects displayed in the dropdown.
  protected readonly subjects = signal<TutorSubject[]>([]);

  // Stores the tutors returned by the latest search.
  protected readonly tutors = signal<TutorSearchResult[]>([]);

  // Tracks whether subject options are loading.
  protected readonly isLoadingSubjects = signal(true);

  // Tracks whether a tutor search request is running.
  protected readonly isSearching = signal(false);

  // Distinguishes an empty initial page from a search with no results.
  protected readonly hasSearched = signal(false);

  // Stores an API error message for the search page.
  protected readonly errorMessage = signal('');

  // Stores the optional tutor search filters.
  protected readonly searchForm = new FormGroup({
    subject: new FormControl('', {
      nonNullable: true,
    }),

    minPrice: new FormControl<number | null>(null, {
      validators: [Validators.min(0)],
    }),

    maxPrice: new FormControl<number | null>(null, {
      validators: [Validators.min(0)],
    }),

    minRating: new FormControl<number | null>(null, {
      validators: [
        Validators.min(0),
        Validators.max(5),
      ],
    }),

    availableThisWeek: new FormControl(false, {
      nonNullable: true,
    }),
  });
    // Loads the subject dropdown when the search page opens.
  ngOnInit(): void {
    this.monitorConnection();

    if (this.isOffline()) {
      this.loadCachedTutorSearch();
      return;
    }

    this.loadSubjects();
  }

  // Requests the subject catalogue from the backend.
  private loadSubjects(): void {
    this.isLoadingSubjects.set(true);

    this.tutorData.getSubjects().subscribe({
      next: (subjects) => {
        this.subjects.set(subjects);
        this.errorMessage.set('');
        this.isLoadingSubjects.set(false);
      },
      error: () => {
        this.errorMessage.set('Unable to load the subject catalogue.');
        this.isLoadingSubjects.set(false);
      },
    });
  }
    // Submits the optional filters and stores the returned tutor results.
  protected searchTutors(): void {
    if (globalThis.navigator?.onLine === false) {
      this.isOffline.set(true);
      this.loadCachedTutorSearch();
      return;
    }

    if (this.searchForm.invalid) {
      this.searchForm.markAllAsTouched();
      return;
    }

    this.isSearching.set(true);
    this.hasSearched.set(true);
    this.errorMessage.set('');

    const filters = this.searchForm.getRawValue();

    this.tutorData.searchTutors(filters).subscribe({
      next: (tutors) => {
        const previous = this.offlineCache.getTutorSearch();
        const subjects =
          this.subjects().length > 0
            ? this.subjects()
            : previous?.data.subjects ?? [];

        this.tutors.set(tutors);
        this.isOffline.set(false);
        this.offlineFetchedAt.set(null);
        this.isSearching.set(false);

        this.offlineCache.saveTutorSearch({
          tutors,
          subjects,
          filters,
        });
      },
      error: () => {
        if (
          globalThis.navigator?.onLine === false &&
          this.loadCachedTutorSearch()
        ) {
          return;
        }

        this.tutors.set([]);
        this.errorMessage.set('Unable to search for tutors.');
        this.isSearching.set(false);
      },
    });
  }
    // Clears all filters and loads the complete tutor list.
  protected resetSearch(): void {
    this.searchForm.reset({
      subject: '',
      minPrice: null,
      maxPrice: null,
      minRating: null,
      availableThisWeek: false,
    });

    this.searchTutors();
  }

  // Restores the last search, its filters and subject catalogue.
  private loadCachedTutorSearch(): boolean {
    const snapshot = this.offlineCache.getTutorSearch();

    if (!snapshot) {
      this.tutors.set([]);
      this.subjects.set([]);
      this.hasSearched.set(false);
      this.errorMessage.set(
        'You are offline and no saved tutor search is available.',
      );
      this.isSearching.set(false);
      this.isLoadingSubjects.set(false);
      return false;
    }

    this.searchForm.reset(snapshot.data.filters);
    this.tutors.set(snapshot.data.tutors);
    this.subjects.set(snapshot.data.subjects);
    this.hasSearched.set(true);
    this.offlineFetchedAt.set(snapshot.fetchedAt);
    this.errorMessage.set('');
    this.isSearching.set(false);
    this.isLoadingSubjects.set(false);

    return true;
  }

  // Refreshes the last search automatically when the connection returns.
  private monitorConnection(): void {
    fromEvent(window, 'offline')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.isOffline.set(true);
        this.loadCachedTutorSearch();
      });

    fromEvent(window, 'online')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.isOffline.set(false);
        this.loadSubjects();

        if (this.hasSearched()) {
          this.searchTutors();
        }
      });
  }
}
