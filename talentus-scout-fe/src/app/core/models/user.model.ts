export type UserRole = 'ADMIN' | 'TUTOR' | 'SCOUT' | 'CLUB_VERIFIER' | 'VERIFIER_ORG';
export type UserStatus = 'PENDING_VERIFICATION' | 'PENDING_EMAIL_VERIFICATION' | 'ACTIVE' | 'SUSPENDED';
export type ScoutVerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface User {
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
