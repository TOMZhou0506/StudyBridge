// A3 Task 4: Defines tutor search, tutor detail, subject, slot, and review data.
export type SubjectCategory =
  | 'Mathematics'
  | 'Computer Science'
  | 'Science'
  | 'Languages'
  | 'Business'
  | 'Other';

// Represents a subject used by the search dropdown.
export interface TutorSubject {
  _id: string;
  name: string;
  category: SubjectCategory;
  description?: string;
  createdDate: string;
}

// Represents the optional filters accepted by tutor search.
export interface TutorSearchFilters {
  subject: string;
  minPrice: number | null;
  maxPrice: number | null;
  minRating: number | null;
  availableThisWeek: boolean;
}

// Represents one tutor returned by GET /tutors/search.
export interface TutorSearchResult {
  userId: string;
  fullName: string;
  bio: string;
  hourlyRate: number;
  subjects: string[];
  photoUrl: string | null;
  averageRating: number | null;
  reviewCount: number;
  reliabilityScore: number;
}

// Represents an open availability slot on the tutor detail page.
export interface TutorAvailabilitySlot {
  _id: string;
  tutorId: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  isBooked: boolean;
  createdDate: string;
}

// A3 Task 8: Represents a review displayed on the tutor detail page.
export interface TutorReview {
  _id: string;
  rating: number;
  comment: string;
  createdDate: string;
}

// Represents the response from GET /tutors/:userId.
export interface TutorDetailResponse {
  userId: string;
  fullName: string;
  bio: string;
  hourlyRate: number;
  subjects: string[];
  photoUrl: string | null;
  averageRating: number | null;
  reviewCount: number;
  availableSlots: TutorAvailabilitySlot[];
  reviews: TutorReview[];
}
