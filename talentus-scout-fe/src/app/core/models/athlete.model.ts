export interface AthleteSummary {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  birthDate: string;
  age: number;
  primaryPosition: string;
  preferredFoot: string;
  slug: string;
  profilePhotoUrl?: string;
  isPublic: boolean;
  subscriptionStatus?: 'ACTIVE' | 'PENDING_AUDIT' | 'INACTIVE';
  subscriptionEndDate?: string;
  canAccessRadar?: boolean;
  visibleInScoutDirectory?: boolean;
  identityDocumentType?: string;
  identityDocumentNumber?: string;
  identityDocumentFileUrl?: string;
  hasIdentityDocument?: boolean;
  legalVerificationStatus?: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  legalVerificationNotes?: string;
  legalVerifiedAt?: string;
}

export interface PublicClubDto {
  name: string;
  logoUrl?: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface AthleteMetricsDto {
  heightCm?: number;
  weightKg?: number;
  medicalCertified?: boolean;
  medicalCertifierInfo?: string;
}

export type BadgeType = 'FEDERATION_LICENSE' | 'CLUB_AFFILIATION' | 'MEDICAL_ANTHRO' | 'SCOUT_ENDORSEMENT' | 'SPORT_ACHIEVEMENT';

export interface PublicBadgeDto {
  type: BadgeType;
  title: string;
  verified: boolean;
  organizationName?: string;
  verifiedAt?: string;
}

export interface PublicVideoDto {
  id: string;
  title: string;
  category: string;
  playbackUrl?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
}

export interface PublicAthleteResponse {
  id: string;
  slug: string;
  firstName: string;
  lastName: string;
  fullName: string;
  age: number;
  birthDate: string;
  gender: string;
  primaryPosition: string;
  secondaryPosition?: string;
  preferredFoot: string;
  nationality: string;
  secondaryPassports?: string;
  profilePhotoUrl?: string;
  bio?: string;
  club?: PublicClubDto;
  metrics?: AthleteMetricsDto;
  badges: PublicBadgeDto[];
  videos: PublicVideoDto[];
}

export interface CreateAthleteRequest {
  firstName: string;
  lastName: string;
  birthDate: string;
  gender?: string;
  primaryPosition: string;
  secondaryPosition?: string;
  preferredFoot: string;
  nationality?: string;
  secondaryPassports?: string;
  currentClubId?: string;
  customClubName?: string;
  customClubCity?: string;
  customClubState?: string;
  customClubCountry?: string;
  federationLicenseNumber?: string;
  heightCm?: number;
  weightKg?: number;
  profilePhotoUrl?: string;
  bio?: string;
  isPublic?: boolean;
}

export interface ClubDto {
  id: string;
  name: string;
  federationCode?: string;
  city?: string;
  state?: string;
  country?: string;
  logoUrl?: string;
  verifiedOfficial?: boolean;
}

