import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { Auth } from '../../../core/auth/auth';
import { SlotSocket } from '../../../core/realtime/slot-socket';
import { BookingData } from '../../bookings/booking-data';
import { TutorData } from '../tutor-data';
import {
  TutorDetailResponse,
  TutorSubject,
} from '../tutor.models';

import { CostPreview } from '../../bookings/cost-preview/cost-preview';
import { TutorAvatar } from '../../../shared/tutor-avatar/tutor-avatar';

// A3 Task 4: Loads and displays one tutor's profile, open slots, and reviews.
@Component({
  imports: [DatePipe, DecimalPipe, RouterLink, CostPreview, TutorAvatar],
  selector: 'app-tutor-detail',
  styleUrl: './tutor-detail.scss',
  templateUrl: './tutor-detail.html',
})
export class TutorDetail implements OnInit {
  // Provides access to the userId stored in the current route.
  private readonly route = inject(ActivatedRoute);

  // A3 Task 6: Adds learner booking controls and lost-race handling to this view.
  private readonly router = inject(Router);

  // Provides the current authenticated user's role.
  private readonly auth = inject(Auth);

  // A3 Task 10: Reacts to relevant booked and freed slot broadcasts.
  private readonly destroyRef = inject(DestroyRef);

  // Provides live slot availability events.
  private readonly slotSocket = inject(SlotSocket);

  // Provides the tutor detail API request.
  private readonly tutorData = inject(TutorData);

  // Provides the booking creation API request.
  private readonly bookingData = inject(BookingData);

  // Stores the tutor ID so the page can refresh after a booking conflict.
  private tutorUserId = '';

  // Stores the tutor profile returned by the backend.
  protected readonly tutor = signal<TutorDetailResponse | null>(null);

  // Stores every subject so tutor subject names can be resolved to IDs.
  protected readonly subjects = signal<TutorSubject[]>([]);

  // Keeps only the subjects taught by the selected tutor.
  protected readonly tutorSubjects = computed(() => {
    const tutor = this.tutor();

    if (!tutor) {
      return [];
    }

    return this.subjects().filter((subject) =>
      tutor.subjects.includes(subject.name),
    );
  });

  // Shows the booking controls only to learner accounts.
  protected readonly isLearner = computed(
    () => this.auth.user()?.role === 'learner',
  );

  // Stores the slot selected by the learner.
  protected readonly selectedSlotId = signal('');

  // A3 Task 12: Resolves the selected slot for the embedded cost preview.
protected readonly selectedSlot = computed(() => {
  const selectedSlotId = this.selectedSlotId();

  return (
    this.tutor()?.availableSlots.find(
      (slot) => slot._id === selectedSlotId,
    ) ?? null
  );
});
  // Stores the subject selected by the learner.
  protected readonly selectedSubjectId = signal('');

  // Prevents duplicate submissions while the request is running.
  protected readonly isBooking = signal(false);

  // Stores validation and API errors for the booking form.
  protected readonly bookingErrorMessage = signal('');

  // Tracks whether the tutor detail request is running.
  protected readonly isLoading = signal(true);

  // Stores an error message when the tutor cannot be loaded.
  protected readonly errorMessage = signal('');

  // Reads the userId from the URL when the detail page opens.
  ngOnInit(): void {
    const userId = this.route.snapshot.paramMap.get('userId');

    if (!userId) {
      this.errorMessage.set('The tutor ID is missing from the URL.');
      this.isLoading.set(false);
      return;
    }

    this.tutorUserId = userId;
    this.listenForBookedSlots();
    this.listenForFreedSlots();
    this.loadSubjects();
    this.loadTutor(userId);

  }

  // Records the learner's selected availability slot.
  protected selectSlot(slotId: string): void {
    this.selectedSlotId.set(slotId);
    this.bookingErrorMessage.set('');
  }

  // Records the learner's selected tutor subject.
  protected selectSubject(subjectId: string): void {
    this.selectedSubjectId.set(subjectId);
    this.bookingErrorMessage.set('');
  }

  // Creates a booking from the selected slot and subject.
  protected createBooking(): void {
    if (!this.selectedSlotId() || !this.selectedSubjectId()) {
      this.bookingErrorMessage.set(
        'Please select both an available slot and a subject.',
      );
      return;
    }

    this.isBooking.set(true);
    this.bookingErrorMessage.set('');

    this.bookingData
      .createBooking({
        slotId: this.selectedSlotId(),
        subjectId: this.selectedSubjectId(),
      })
      .subscribe({
        next: () => {
          this.isBooking.set(false);
          void this.router.navigate(['/my-bookings'], {
            state: {
              successMessage: 'Booking requested successfully.',
            },
          });
        },
        error: (error: HttpErrorResponse) => {
          this.isBooking.set(false);

          if (error.status === 409) {
            this.selectedSlotId.set('');
            this.bookingErrorMessage.set(
              'This slot is no longer available. Please select another slot.',
            );
            this.loadTutor(this.tutorUserId);
            return;
          }

          this.bookingErrorMessage.set(
            error.error?.error ?? 'Unable to create the booking.',
          );
        },
      });
  }

  // Loads subject IDs used by the booking request.
  private loadSubjects(): void {
    this.tutorData.getSubjects().subscribe({
      next: (subjects) => this.subjects.set(subjects),
      error: () => {
        this.subjects.set([]);
        this.bookingErrorMessage.set(
          'Unable to load the subjects for booking.',
        );
      },
    });
  }

  // Removes a newly booked slot without another HTTP request.
  private listenForBookedSlots(): void {
    this.slotSocket.slotBooked
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ slotId, tutorId }) => {
        if (tutorId !== this.tutorUserId) {
          return;
        }

        this.tutor.update((currentTutor) => {
          if (!currentTutor) {
            return currentTutor;
          }

          return {
            ...currentTutor,
            availableSlots: currentTutor.availableSlots.filter(
              (slot) => slot._id !== slotId,
            ),
          };
        });

        if (this.selectedSlotId() === slotId) {
          this.selectedSlotId.set('');
          this.bookingErrorMessage.set(
            'This slot was just booked. Please select another slot.',
          );
        }
      });
  }

  // Reloads the tutor when a cancelled booking frees a slot.
private listenForFreedSlots(): void {
  this.slotSocket.slotFreed
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(({ tutorId }) => {
      if (tutorId !== this.tutorUserId) {
        return;
      }

      this.loadTutor(this.tutorUserId);
    });
}
  // Loads the tutor profile, open slots, and reviews.
  private loadTutor(userId: string): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.tutorData.getTutor(userId).subscribe({
      next: (tutor) => {
        this.tutor.set(tutor);
        this.isLoading.set(false);
      },
      error: () => {
        this.tutor.set(null);
        this.errorMessage.set('Unable to load the tutor details.');
        this.isLoading.set(false);
      },
    });
  }
}
