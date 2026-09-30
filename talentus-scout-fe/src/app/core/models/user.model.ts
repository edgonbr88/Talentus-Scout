export type UserRole = 'ADMIN' | 'TUTOR' | 'SCOUT' | 'CLUB_VERIFIER';
export type UserStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  role: UserRole;
  status?: UserStatus;
}
