export interface AdminClub {
  id: string;
  name: string;
  federationCode?: string | null;
  city: string;
  state: string;
  country: string;
  logoUrl?: string | null;
  verifiedOfficial: boolean;
  createdAt: string;
  athletesCount: number;
  scoutsCount: number;
}

export interface AdminClubPage {
  content: AdminClub[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface ClubStats {
  totalClubs: number;
  verifiedClubs: number;
  pendingClubs: number;
  totalAffiliatedAthletes: number;
}

export interface CreateClubPayload {
  name: string;
  federationCode?: string;
  city: string;
  state: string;
  country?: string;
  logoUrl?: string;
  verifiedOfficial?: boolean;
}

export interface UpdateClubPayload {
  name: string;
  federationCode?: string;
  city: string;
  state: string;
  country: string;
  logoUrl?: string;
  verifiedOfficial?: boolean;
}
