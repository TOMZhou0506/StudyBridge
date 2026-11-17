// A3 Task 5: Defines tutor profile and availability-slot request and response data.
export interface TutorProfileRequest {
  bio: string;
  hourlyRate: number;
  subjects: string[];

  // A3 HD Task 3: Sends a new photo URL only when the tutor uploaded one.
  photoUrl?: string;
}

// Represents a tutor profile returned after create or update.
export interface TutorProfileRecord {
  _id: string;
  userId: string;
  bio: string;
  hourlyRate: number;
  subjects: string[];
  photoUrl?: string | null;
  createdDate: string;
}

// Represents the request body used to publish a slot.
export interface CreateSlotRequest {
  date: string;
  startTime: string;
  durationMinutes: number;
}

// Represents the response returned after deleting a slot.
export interface DeleteSlotResponse {
  message: string;
}
