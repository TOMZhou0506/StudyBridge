
// A3 Task 3: Defines the data shapes used by the role-based dashboard.
export type BookingStatus =
  | 'requested'
  | 'confirmed'
  | 'completed'
  | 'cancelled';

// Represents the booking fields required by the dashboard.
export interface DashboardBooking {
  _id: string;
  status: BookingStatus;
}

// Represents the availability slot fields required by the dashboard.
export interface DashboardSlot {
  _id: string;
  isBooked: boolean;
}

// Represents the subject fields required by the dashboard.
export interface DashboardSubject {
  _id: string;
  name: string;
}

// Represents a popular subject in the admin analytics.
export interface TopSubject {
  subjectId: string;
  subjectName: string;
  bookingCount: number;
}

// Represents a top-performing tutor in the admin analytics.
export interface TopTutor {
  tutorId: string;
  fullName: string;
  completedBookingCount: number;
}

// Represents the analytics returned for the admin dashboard.
export interface AdminAnalytics {
  topSubjects: TopSubject[];
  topTutors: TopTutor[];
  totalBookings: number;
  completionRate: number;
  cancellationRate: number;
  estimatedRevenue: number;
}
