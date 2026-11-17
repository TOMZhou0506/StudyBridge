// A3 Task 1: Defines authentication request, response, and user types.
export type UserRole = 'learner' | 'tutor' | 'admin';

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  role: 'learner' | 'tutor';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}

export interface AuthMeResponse {
  _id: string;
  fullName: string;
  email: string;
  role: UserRole;
  createdDate: string;
  greeting: string;
  reliabilityScore: number;
}

export interface AuthUser {
  userId: string;
  fullName: string;
  email: string;
  role: UserRole;
  createdDate: string;
  greeting: string;
  reliabilityScore: number;
}

export interface ApiError {
  error: string;
}
