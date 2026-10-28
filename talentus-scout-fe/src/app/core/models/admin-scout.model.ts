export type ScoutVerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type ReviewScoutDecision = 'APPROVE' | 'REJECT';

export interface PendingScout {
  scoutProfileId: string;
  userId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  organizationName: string;
  scoutRole: string;
  credentialsDocumentUrl: string;
  linkedinUrl?: string;
  verificationStatus: ScoutVerificationStatus;
  createdAt: string;
}

export interface ReviewScoutRequest {
  decision: ReviewScoutDecision;
  rejectionReason?: string;
}

export interface ScoutReviewResponse {
  scoutProfileId: string;
  userId: string;
  fullName: string;
  verificationStatus: ScoutVerificationStatus;
  accountStatus: string;
  reviewedByAdminId: string;
  reviewedByAdminName: string;
  reviewedAt: string;
  rejectionReason?: string;
  message: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
