import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';

import { TutorAvailabilitySlot } from '../../tutors/tutor.models';
import { TutorManagementData } from '../tutor-management-data';
import { CreateSlotRequest } from '../tutor-management.models';

// A3 Task 5: Publishes, lists, and deletes the authenticated tutor's slots.
@Component({
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  selector: 'app-tutor-slots',
  styleUrl: './tutor-slots.scss',
  templateUrl: './tutor-slots.html',
})
export class TutorSlots implements OnInit {
  // Provides availability-slot API requests.
  private readonly managementData = inject(TutorManagementData);

  // Stores all slots belonging to the authenticated tutor.
  protected readonly slots = signal<TutorAvailabilitySlot[]>([]);

  // Tracks the initial slot-list request.
  protected readonly isLoading = signal(true);

  // Tracks the create-slot request.
  protected readonly isSaving = signal(false);

  // Stores the ID of the slot currently being deleted.
  protected readonly deletingSlotId = signal<string | null>(null);

  // Indicates that the tutor must create a profile before publishing slots.
  protected readonly profileRequired = signal(false);

  // Stores the latest successful operation message.
  protected readonly successMessage = signal('');

  // Stores backend validation and request errors.
  protected readonly errorMessage = signal('');

  // Stores the new availability-slot values.
  protected readonly slotForm = new FormGroup({
    date: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    startTime: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    durationMinutes: new FormControl<number | null>(null, {
      validators: [
        Validators.required,
        Validators.min(30),
        Validators.max(180),
      ],
    }),
  });

  // Loads the tutor's existing slots when the page opens.
  ngOnInit(): void {
    this.loadSlots();
  }

  // Requests every slot owned by the authenticated tutor.
  private loadSlots(): void {
    this.isLoading.set(true);

    this.managementData.getMySlots().subscribe({
      next: (slots) => {
        this.slots.set(this.sortSlots(slots));
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Unable to load your availability slots.');
        this.isLoading.set(false);
      },
    });
  }

  // Publishes a new slot and preserves the backend's specific 409 message.
  protected createSlot(): void {
    if (this.slotForm.invalid) {
      this.slotForm.markAllAsTouched();
      return;
    }

    const value = this.slotForm.getRawValue();
    if (value.durationMinutes === null) {
      return;
    }

    const request: CreateSlotRequest = {
      date: value.date,
      startTime: value.startTime,
      durationMinutes: value.durationMinutes,
    };

    this.isSaving.set(true);
    this.profileRequired.set(false);
    this.successMessage.set('');
    this.errorMessage.set('');

    this.managementData.createSlot(request).subscribe({
      next: (slot) => {
        this.slots.set(this.sortSlots([...this.slots(), slot]));
        this.slotForm.reset({
          date: '',
          startTime: '',
          durationMinutes: null,
        });
        this.successMessage.set('Availability slot published successfully.');
        this.isSaving.set(false);
      },
      error: (error: HttpErrorResponse) => {
        const message = error.error?.error ?? 'Unable to publish the slot.';
        this.errorMessage.set(message);
        this.profileRequired.set(
          error.status === 409 &&
            message === 'tutor profile must be created before publishing slots',
        );
        this.isSaving.set(false);
      },
    });
  }

  // Confirms and deletes an unbooked slot.
  protected deleteSlot(slot: TutorAvailabilitySlot): void {
    if (slot.isBooked) {
      return;
    }

    const confirmed = window.confirm(
      `Delete the slot on ${new Date(slot.date).toLocaleDateString()} at ${slot.startTime}?`,
    );
    if (!confirmed) {
      return;
    }

    this.deletingSlotId.set(slot._id);
    this.successMessage.set('');
    this.errorMessage.set('');

    this.managementData.deleteSlot(slot._id).subscribe({
      next: () => {
        this.slots.update((slots) =>
          slots.filter((currentSlot) => currentSlot._id !== slot._id),
        );
        this.successMessage.set('Availability slot deleted successfully.');
        this.deletingSlotId.set(null);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(
          error.error?.error ?? 'Unable to delete the slot.',
        );
        this.deletingSlotId.set(null);
      },
    });
  }

  // Sorts slots by date and start time for predictable display.
  private sortSlots(slots: TutorAvailabilitySlot[]): TutorAvailabilitySlot[] {
    return [...slots].sort((first, second) => {
      const firstValue = `${first.date}-${first.startTime}`;
      const secondValue = `${second.date}-${second.startTime}`;
      return firstValue.localeCompare(secondValue);
    });
  }
}
