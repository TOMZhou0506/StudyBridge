// A3 Task 6: Defines booking status, creation request, and booking response data.
export type BookingStatus =
  | 'requested'
  | 'confirmed'
  | 'completed'
  | 'cancelled';

// Represents the request body used to reserve a tutor slot.
export interface CreateBookingRequest {
  slotId: string;
  subjectId: string;
}

// Represents a session booking returned by the backend.
export interface SessionBooking {
  _id: string;
  learnerId: string;
  tutorId: string;
  subjectId: string;
  slotId: string;
  agreedRate: number;
  status: BookingStatus;
  createdDate: string;
  cancelledBy: 'learner' | 'tutor' | null;
}

// A3 Task 8: Defines review submission and response data.
export interface CreateReviewRequest {
  rating: number;
  comment?: string;
}

// Represents a review returned after successful submission.
export interface BookingReview {
  _id: string;
  bookingId: string;
  learnerId: string;
  tutorId: string;
  rating: number;
  comment?: string;
  createdDate: string;
}

// A3 HD Task 5: Defines the request and response used by AI recap generation.
export interface GenerateRecapRequest {
  notes: string;
}

// Represents the ephemeral recap returned by Gemini.
export interface GenerateRecapResponse {
  recap: string;
}
