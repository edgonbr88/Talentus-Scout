export interface ContactClickRequest {
  athleteId: string;
}

export interface ContactClickResponse {
  whatsappUrl: string;
  tutorName: string;
  athleteName: string;
}

export interface ScoutInteractionItem {
  scoutName: string;
  scoutClub: string;
  scoutRole: string;
  activityType: string;
  athleteId: string;
  athleteName: string;
  timestamp: string;
}

export interface AthleteRadarMetricItem {
  athleteId: string;
  athleteName: string;
  searchAppearances: number;
  profileViews: number;
  contactClicks: number;
}

export interface TutorRadarMetricsResponse {
  totalSearchAppearances: number;
  totalProfileViews: number;
  totalContactClicks: number;
  recentInteractions: ScoutInteractionItem[];
  athletesMetrics: AthleteRadarMetricItem[];
}
