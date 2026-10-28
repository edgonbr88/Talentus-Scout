import { BadgeType } from './athlete.model';

export interface CertificationRequest {
  id: string;
  athleteId: string;
  athleteFullName?: string;
  badgeType: BadgeType;
  requestMethod: 'DOCUMENT_UPLOAD' | 'TOKEN_LINK' | 'DIRECT_ORGANIZATION';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  title: string;
  description?: string;
  evidenceDocumentUrl?: string;
  targetEmail?: string;
  targetName?: string;
  targetOrganization?: string;
  tokenHash?: string;
  certificationLink?: string;
  tokenExpiresAt?: string;
  certifierFullName?: string;
  certifierLicenseId?: string;
  certifierNotes?: string;
  certificationDataJson?: string;
  completedAt?: string;
  createdAt: string;
  badgeId?: string;
}

export interface CreateDocumentCertificationRequest {
  athleteId: string;
  badgeType: BadgeType;
  title: string;
  description?: string;
  evidenceDocumentUrl: string;
}

export interface CreateTokenCertificationRequest {
  athleteId: string;
  badgeType: BadgeType;
  title: string;
  description?: string;
  targetEmail: string;
  targetName: string;
  targetOrganization?: string;
}

export interface PublicTokenCertificationResponse {
  token: string;
  athleteId: string;
  athleteFullName: string;
  athleteCategory: string;
  athleteClubName?: string;
  athletePosition?: string;
  badgeType: BadgeType;
  badgeTypeLabel: string;
  title: string;
  description?: string;
  targetEmail?: string;
  targetName?: string;
  targetOrganization?: string;
  expiresAt: string;
  expired: boolean;
  alreadyCompleted: boolean;
}

export interface SubmitTokenCertificationRequest {
  certifierFullName: string;
  certifierLicenseId: string;
  certifierNotes?: string;
  heightCm?: number | null;
  weightKg?: number | null;
  bodyFatPercent?: number | null;
  muscleMassKg?: number | null;
  goalsScored?: number | null;
  tournamentName?: string | null;
  achievementTitle?: string | null;
}

export interface AdminReviewCertificationRequest {
  decision: 'APPROVE' | 'REJECT';
  adminNotes?: string;
}
