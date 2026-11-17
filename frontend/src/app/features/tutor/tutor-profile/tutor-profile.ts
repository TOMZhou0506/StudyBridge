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
import {
  catchError,
  forkJoin,
  of,
  switchMap,
  throwError,
} from 'rxjs';

import { Auth } from '../../../core/auth/auth';
import { TutorAvatar } from '../../../shared/tutor-avatar/tutor-avatar';
import { TutorData } from '../../tutors/tutor-data';
import { TutorSubject } from '../../tutors/tutor.models';
import { PhotoUploadData } from '../photo-upload-data';
import { TutorManagementData } from '../tutor-management-data';
import { TutorProfileRequest } from '../tutor-management.models';

// A3 Task 5: Creates or fully updates the authenticated tutor's profile.
@Component({
  imports: [ReactiveFormsModule, TutorAvatar],
  selector: 'app-tutor-profile',
  styleUrl: './tutor-profile.scss',
  templateUrl: './tutor-profile.html',
})
export class TutorProfile implements OnInit {
  // Exposes the authenticated tutor and their userId.
  protected readonly user = inject(Auth).user;

  // Provides subject and public-profile read requests.
  private readonly tutorData = inject(TutorData);

  // Provides tutor profile create and update requests.
  private readonly managementData = inject(TutorManagementData);

  // A3 HD Task 3: Uploads the binary first, then persists its returned URL.
  private readonly photoUploadData = inject(PhotoUploadData);

  // Stores the available subject catalogue.
  protected readonly subjects = signal<TutorSubject[]>([]);

  // Indicates whether an existing profile will be updated.
  protected readonly isEditMode = signal(false);

  // Tracks the initial profile and subject requests.
  protected readonly isLoading = signal(true);

  // Tracks the profile create or update request.
  protected readonly isSaving = signal(false);

  // Stores the latest successful save message.
  protected readonly successMessage = signal('');

  // Stores a profile loading or saving error.
  protected readonly errorMessage = signal('');

  // Stores the tutor's currently persisted photo.
  protected readonly currentPhotoUrl = signal<string | null>(null);

  // Stores the image selected from the file input.
  protected readonly selectedPhoto = signal<File | null>(null);

  // Tracks the two-stage upload and profile-update operation.
  protected readonly isUploadingPhoto = signal(false);

  // Stores image validation or upload errors.
  protected readonly photoErrorMessage = signal('');

  // Stores the complete tutor profile form.
  protected readonly profileForm = new FormGroup({
    bio: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(500)],
    }),
    hourlyRate: new FormControl<number | null>(null, {
      validators: [
        Validators.required,
        Validators.min(5),
        Validators.max(200),
      ],
    }),
    subjects: new FormControl<string[]>([], {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  // Loads the subject catalogue and the tutor's existing profile together.
  ngOnInit(): void {
    const userId = this.user()?.userId;

    if (!userId) {
      this.errorMessage.set('Unable to identify the current tutor.');
      this.isLoading.set(false);
      return;
    }

    forkJoin({
      subjects: this.tutorData.getSubjects(),
      profile: this.tutorData.getTutor(userId).pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 404) {
            return of(null);
          }

          return throwError(() => error);
        }),
      ),
    }).subscribe({
      next: ({ subjects, profile }) => {
        this.subjects.set(subjects);

        if (profile) {
          const selectedSubjectIds = subjects
            .filter((subject) => profile.subjects.includes(subject.name))
            .map((subject) => subject._id);

          this.profileForm.setValue({
            bio: profile.bio ?? '',
            hourlyRate: profile.hourlyRate,
            subjects: selectedSubjectIds,
          });
          this.currentPhotoUrl.set(profile.photoUrl ?? null);
          this.isEditMode.set(true);
        }

        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Unable to load the tutor profile.');
        this.isLoading.set(false);
      },
    });
  }

  // Creates or fully replaces the authenticated tutor's profile.
  protected saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const value = this.profileForm.getRawValue();
    if (value.hourlyRate === null) {
      return;
    }

    const request: TutorProfileRequest = {
      bio: value.bio.trim(),
      hourlyRate: value.hourlyRate,
      subjects: value.subjects,
    };

    this.isSaving.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');

    const saveRequest = this.isEditMode()
      ? this.managementData.updateProfile(request)
      : this.managementData.createProfile(request);

    saveRequest.subscribe({
      next: () => {
        this.isEditMode.set(true);
        this.successMessage.set('Tutor profile saved successfully.');
        this.isSaving.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(
          error.error?.error ?? 'Unable to save the tutor profile.',
        );
        this.isSaving.set(false);
      },
    });
  }

  // Validates one locally selected tutor photo.
  protected selectPhoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    this.photoErrorMessage.set('');
    this.selectedPhoto.set(null);

    if (!file) {
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      this.photoErrorMessage.set('Select a JPEG, PNG, or WebP image.');
      input.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.photoErrorMessage.set('Image must not exceed 5 MB.');
      input.value = '';
      return;
    }

    this.selectedPhoto.set(file);
  }

  // Uploads the binary first, then persists its returned URL.
  protected uploadPhoto(): void {
    const file = this.selectedPhoto();
    const value = this.profileForm.getRawValue();

    if (!file || !this.isEditMode() || value.hourlyRate === null) {
      return;
    }

    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const request: TutorProfileRequest = {
      bio: value.bio.trim(),
      hourlyRate: value.hourlyRate,
      subjects: value.subjects,
    };

    this.isUploadingPhoto.set(true);
    this.successMessage.set('');
    this.photoErrorMessage.set('');

    this.photoUploadData
      .uploadPhoto(file)
      .pipe(
        switchMap(({ url }) =>
          this.managementData.updateProfile({
            ...request,
            photoUrl: url,
          }),
        ),
      )
      .subscribe({
        next: (profile) => {
          this.currentPhotoUrl.set(profile.photoUrl ?? null);
          this.selectedPhoto.set(null);
          this.successMessage.set('Tutor photo uploaded successfully.');
          this.isUploadingPhoto.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.photoErrorMessage.set(
            error.error?.error ?? 'Unable to upload the tutor photo.',
          );
          this.isUploadingPhoto.set(false);
        },
      });
  }
}
