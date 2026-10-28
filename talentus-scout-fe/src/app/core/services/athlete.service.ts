import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AthleteSummary, CreateAthleteRequest, ClubDto, PublicAthleteResponse } from '../models/athlete.model';
import { TutorRadarMetricsResponse } from '../models/scout-contact.model';

@Injectable({
  providedIn: 'root'
})
export class AthleteService {
  private http = inject(HttpClient);

  createAthlete(request: CreateAthleteRequest): Observable<AthleteSummary> {
    return this.http.post<AthleteSummary>('/api/v1/athletes', request);
  }

  getClubs(): Observable<ClubDto[]> {
    return this.http.get<ClubDto[]>('/api/v1/clubs');
  }

  getMyAthletes(): Observable<AthleteSummary[]> {
    return this.http.get<AthleteSummary[]>('/api/v1/athletes/my-athletes');
  }

  getTutorRadarMetrics(): Observable<TutorRadarMetricsResponse> {
    return this.http.get<TutorRadarMetricsResponse>('/api/v1/athletes/radar');
  }

  getPublicAthleteBySlug(slug: string): Observable<PublicAthleteResponse> {
    return this.http.get<PublicAthleteResponse>(`/api/v1/athletes/public/${slug}`);
  }

  downloadAthleteCvPdf(athleteId: string): Observable<Blob> {
    return this.http.get(`/api/v1/athletes/${athleteId}/cv-pdf`, {
      responseType: 'blob'
    });
  }

  uploadIdentityDocument(athleteId: string, formData: FormData): Observable<AthleteSummary> {
    return this.http.post<AthleteSummary>(`/api/v1/athletes/${athleteId}/identity-document`, formData);
  }

  uploadAthletePhoto(athleteId: string, file: File): Observable<AthleteSummary> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<AthleteSummary>(`/api/v1/athletes/${athleteId}/photo`, formData);
  }

  deleteAthletePhoto(athleteId: string): Observable<AthleteSummary> {
    return this.http.delete<AthleteSummary>(`/api/v1/athletes/${athleteId}/photo`);
  }
}
