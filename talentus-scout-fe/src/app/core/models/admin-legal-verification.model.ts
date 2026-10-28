export type LegalVerificationStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

export interface LegalVerificationItem {
  athleteId: string;
  athleteFirstName: string;
  athleteLastName: string;
  athleteFullName: string;
  athleteSlug: string;
  birthDate: string;
  athleteAge: number;
  primaryPosition: string;
  nationality: string;
  athleteDocType: string;
  athleteDocNumber: string;
  athleteDocFileUrl: string;
  tutorId: string;
  tutorFullName: string;
  tutorEmail: string;
  tutorPhoneNumber: string;
  tutorDocType: string;
  tutorDocNumber: string;
  tutorDocFileUrl: string;
  submittedAt: string;
  status: LegalVerificationStatus;
  notes?: string;
  verifiedAt?: string;
  verifiedByEmail?: string;
}

export interface VerificationMetrics {
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
}

export interface ReviewLegalVerificationRequest {
  decision: LegalVerificationStatus;
  notes?: string;
}

export interface LegalVerificationReviewResponse {
  athleteId: string;
  decision: LegalVerificationStatus;
  notes?: string;
  verifiedByEmail: string;
  verifiedAt: string;
  message: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}
