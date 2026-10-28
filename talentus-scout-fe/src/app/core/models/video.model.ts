export type VideoCategory = 'HIGHLIGHTS' | 'GOLES' | 'ASISTENCIAS' | 'DEFENSA' | 'PARTIDO_COMPLETO';
export type VideoStatus = 'PENDING_UPLOAD' | 'PROCESSING' | 'READY' | 'FAILED';

export interface RequestUploadRequest {
  athleteId: string;
  title: string;
  category: VideoCategory;
}

export interface UploadTicketResponse {
  videoId: string;
  directUploadUrl: string;
  providerVideoId: string;
  maxSizeBytes: number;
}

export interface AthleteVideoResponse {
  id: string;
  athleteId: string;
  title: string;
  category: VideoCategory;
  providerVideoId: string;
  playbackUrl?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  status: VideoStatus;
  sortOrder: number;
  createdAt: string;
}

export interface UploadProgressState {
  status: 'idle' | 'selected' | 'requesting_ticket' | 'uploading' | 'processing' | 'ready' | 'error';
  percentage: number;
  loadedBytes: number;
  totalBytes: number;
  speedMbps: number;
  errorMessage?: string;
}
