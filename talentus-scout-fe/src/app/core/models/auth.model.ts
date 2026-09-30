import { User, UserRole, UserStatus } from './user.model';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  expiresIn: number;
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface RegisterTutorRequest {
  fullName: string;
  email: string;
  password: string;
  phoneNumber: string;
  acceptLopnnaTerms: boolean;
}

export interface RegisterTutorResponse {
  userId: string;
  token: string;
  tokenType: string;
  expiresIn: number;
  role: UserRole;
  email: string;
  fullName: string;
}

export interface UserProfileResponse {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  role: UserRole;
  status?: UserStatus;
}
