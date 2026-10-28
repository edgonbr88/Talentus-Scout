import { ScoutVerificationStatus, User, UserRole, UserStatus } from './user.model';

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
  country: string;
  state: string;
  address?: string;
  idDocumentType?: string;
  idDocumentNumber?: string;
  idDocumentFile?: File;
}

export interface RegisterTutorResponse {
  userId: string;
  token?: string;
  tokenType?: string;
  expiresIn?: number;
  role: UserRole;
  email: string;
  fullName: string;
  status?: UserStatus;
  message?: string;
}

export interface ResendVerificationEmailRequest {
  email: string;
}

export interface UserProfileResponse {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  country?: string;
  state?: string;
  address?: string;
  role: UserRole;
  status?: UserStatus;
  scoutVerificationStatus?: ScoutVerificationStatus;
  rejectionReason?: string;
  isProfileCompleted?: boolean;
}

export interface SocialAuthRequest {
  token: string;
  mockEmail?: string;
  mockName?: string;
}

export interface SocialAuthResponse {
  token: string;
  tokenType: string;
  expiresIn: number;
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
  needsProfileCompletion: boolean;
  provider: 'GOOGLE' | 'MICROSOFT';
}

export interface CompleteProfileRequest {
  role: UserRole;
  phoneNumber: string;
  acceptLegalConsent?: boolean;
  organizationName?: string;
  scoutRole?: string;
  linkedinUrl?: string;
}

export interface RegisterScoutRequest {
  fullName: string;
  email: string;
  password: string;
  phoneNumber: string;
  organizationName?: string;
  organizationClubId?: string;
  customClubCity?: string;
  customClubState?: string;
  customClubCountry?: string;
  scoutRole: string;
  linkedinUrl?: string;
  credentialsFile: File;
}

export interface RegisterScoutResponse {
  scoutProfileId: string;
  userId: string;
  token?: string;
  tokenType?: string;
  expiresIn?: number;
  role: UserRole;
  accountStatus: UserStatus;
  verificationStatus: ScoutVerificationStatus;
  email: string;
  fullName: string;
  organizationName: string;
  scoutRole: string;
  credentialsDocumentUrl?: string;
  message?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ResetPasswordResponse {
  message: string;
}

