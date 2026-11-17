import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Auth } from '../../core/auth/auth';
import { DashboardData } from './dashboard-data';
import {
  AdminAnalytics,
  BookingStatus,
  DashboardBooking,
} from './dashboard.models';
import {
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, interval } from 'rxjs';

// A3 Task 3: Coordinates the learner, tutor, and admin dashboards.
@Component({
  imports: [CurrencyPipe, DecimalPipe],
  selector: 'app-dashboard',
  styleUrl: './dashboard.scss',
  templateUrl: './dashboard.html',
})

export class Dashboard implements OnInit  {
  // Exposes the authenticated user to the dashboard template.
  protected readonly user = inject(Auth).user;

  // Provides the API requests required by each dashboard role.
  private readonly dashboardData = inject(DashboardData);

  // Tracks whether the dashboard is currently loading data.
  protected readonly isLoading = signal(true);

  // Stores an error message when dashboard data cannot be loaded.
  protected readonly errorMessage = signal('');

    // Stops the refresh timer when the dashboard component is destroyed.
  private readonly destroyRef = inject(DestroyRef);

  // Stores booking totals grouped by their current status.
  protected readonly bookingCounts = signal<Record<BookingStatus, number>>({
    requested: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
  });

  // Stores the number of unbooked slots belonging to the tutor.
  protected readonly openSlotCount = signal(0);

  // Stores the number of subjects available in the catalogue.
  protected readonly subjectCount = signal(0);

  // Stores the Assignment 2 HD analytics for an administrator.
  protected readonly analytics = signal<AdminAnalytics | null>(null);

    // Loads the dashboard immediately and refreshes its figures every 30 seconds.
  ngOnInit(): void {
    this.loadDashboard(true);

    interval(30_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loadDashboard();
      });
  }
    // Counts the current user's bookings by status.
  private updateBookingCounts(bookings: DashboardBooking[]): void {
    const counts: Record<BookingStatus, number> = {
      requested: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
    };

    for (const booking of bookings) {
      counts[booking.status]++;
    }

    this.bookingCounts.set(counts);
  }
    // Loads booking statistics for the learner dashboard.
  private loadLearnerDashboard(): void {
    this.dashboardData.getMyBookings().subscribe({
      next: (bookings) => {
        this.updateBookingCounts(bookings);
        this.errorMessage.set('');
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Unable to load your booking summary.');
        this.isLoading.set(false);
      },
    });
  }
    // Loads booking and availability statistics for the tutor dashboard.
  private loadTutorDashboard(): void {
    forkJoin({
      bookings: this.dashboardData.getMyBookings(),
      slots: this.dashboardData.getMySlots(),
    }).subscribe({
      next: ({ bookings, slots }) => {
        this.updateBookingCounts(bookings);

        const openSlots = slots.filter((slot) => !slot.isBooked);
        this.openSlotCount.set(openSlots.length);

        this.errorMessage.set('');
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Unable to load your tutor dashboard.');
        this.isLoading.set(false);
      },
    });
  }
    // Loads subject and marketplace statistics for the admin dashboard.
  private loadAdminDashboard(): void {
    forkJoin({
      subjects: this.dashboardData.getSubjects(),
      analytics: this.dashboardData.getAdminAnalytics(),
    }).subscribe({
      next: ({ subjects, analytics }) => {
        this.subjectCount.set(subjects.length);
        this.analytics.set(analytics);

        this.errorMessage.set('');
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Unable to load the admin dashboard.');
        this.isLoading.set(false);
      },
    });
  } 

    // Loads the correct dashboard data for the authenticated user's role.
  private loadDashboard(showLoading = false): void {
    if (showLoading) {
      this.isLoading.set(true);
    }

    const role = this.user()?.role;

    if (!role) {
      this.errorMessage.set('Unable to identify the current user.');
      this.isLoading.set(false);
      return;
    }

    switch (role) {
      case 'learner':
        this.loadLearnerDashboard();
        break;

      case 'tutor':
        this.loadTutorDashboard();
        break;

      case 'admin':
        this.loadAdminDashboard();
        break;
    }
  }
}
