import {
  Component,
  computed,
  input,
  signal,
} from '@angular/core';

// A3 HD Task 3: Reuses a persisted photo with an initials fallback.
@Component({
  selector: 'app-tutor-avatar',
  template: `
    @if (showPhoto()) {
      <img
        class="tutor-avatar rounded-circle border"
        [class.tutor-avatar-large]="size() === 'large'"
        [src]="photoUrl()"
        [alt]="fullName() + ' profile photo'"
        (error)="handlePhotoError()"
      />
    } @else {
      <div
        class="tutor-avatar tutor-avatar-placeholder rounded-circle border d-flex align-items-center justify-content-center"
        [class.tutor-avatar-large]="size() === 'large'"
        [attr.aria-label]="fullName() + ' initials placeholder'"
      >
        {{ initials() }}
      </div>
    }
  `,
  styles: `
    .tutor-avatar {
      width: 5rem;
      height: 5rem;
      flex: 0 0 5rem;
      object-fit: cover;
    }

    .tutor-avatar-large {
      width: 10rem;
      height: 10rem;
      flex-basis: 10rem;
    }

    .tutor-avatar-placeholder {
      background: #e9ecef;
      color: #495057;
      font-size: 1.5rem;
      font-weight: 700;
    }

    .tutor-avatar-placeholder.tutor-avatar-large {
      font-size: 2.25rem;
    }
  `,
})
export class TutorAvatar {
  readonly photoUrl = input<string | null | undefined>(null);
  readonly fullName = input('Tutor');
  readonly size = input<'medium' | 'large'>('medium');

  private readonly failedPhotoUrl = signal<string | null>(null);

  protected readonly showPhoto = computed(() => {
    const photoUrl = this.photoUrl();
    return Boolean(photoUrl) && this.failedPhotoUrl() !== photoUrl;
  });

  protected readonly initials = computed(() => {
    const name = this.fullName().trim();

    if (!name) {
      return 'T';
    }

    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');
  });

  protected handlePhotoError(): void {
    this.failedPhotoUrl.set(this.photoUrl() ?? null);
  }
}
