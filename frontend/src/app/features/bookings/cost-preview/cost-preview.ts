import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { finalize } from 'rxjs';
import { DecimalPipe } from '@angular/common';
import { environment } from '../../../../environments/environment';
import {
  CostBreakdown,
  CostRequest,
} from './cost-preview.models';

@Component({
  imports: [DecimalPipe], //shows the cost with 2 decimal places
  selector: 'app-cost-preview',
  styleUrl: './cost-preview.scss',
  templateUrl: './cost-preview.html',
})
export class CostPreview {
  // A3 Task 12: Calls the standalone service for the selected session cost.
  readonly agreedRate = input.required<number>();

  // Receives the duration of the learner's selected slot.
  readonly durationMinutes = input.required<number>();

  // Provides access to Angular's HTTP client.
  private readonly http = inject(HttpClient);

  // Stores the latest response from the standalone cost service.
  private readonly latestBreakdown = signal<CostBreakdown | null>(null);

  // Stores the input values used for the latest completed calculation.
  private readonly calculatedFor = signal<CostRequest | null>(null);

  // Tracks whether the HTTP request is currently running.
  readonly loading = signal(false);

  // Stores a readable error returned by the standalone service.
  readonly errorMessage = signal('');

  // Hides an old result when the learner selects a different slot.
  readonly breakdown = computed(() => {
    const result = this.latestBreakdown();
    const request = this.calculatedFor();

    if (
      !result ||
      !request ||
      request.agreedRate !== this.agreedRate() ||
      request.durationMinutes !== this.durationMinutes()
    ) {
      return null;
    }

    return result;
  });

  // Calls the standalone service only when the learner clicks the button.
  calculateCost(): void {
    const request: CostRequest = {
      agreedRate: this.agreedRate(),
      durationMinutes: this.durationMinutes(),
    };

    this.loading.set(true);
    this.errorMessage.set('');
    this.latestBreakdown.set(null);
    this.calculatedFor.set(null);

    this.http
      .post<CostBreakdown>(
        `${environment.costServiceUrl}/calculate-cost`,
        request,
      )
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.latestBreakdown.set(response);
          this.calculatedFor.set(request);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            typeof error.error?.error === 'string'
              ? error.error.error
              : 'Unable to calculate the session cost.',
          );
        },
      });
  }
}
