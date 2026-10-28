import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CertificationRequest,
  CreateDocumentCertificationRequest,
  CreateTokenCertificationRequest,
  PublicTokenCertificationResponse,
  SubmitTokenCertificationRequest,
  AdminReviewCertificationRequest
} from '../models/certification.model';

@Injectable({
  providedIn: 'root'
})
export class CertificationService {
  private http = inject(HttpClient);
  private apiUrl = '/api/v1/certifications';
  private adminApiUrl = '/api/v1/admin/certifications';

  requestCertificationWithDocument(request: CreateDocumentCertificationRequest): Observable<CertificationRequest> {
    return this.http.post<CertificationRequest>(`${this.apiUrl}/request-document`, request);
  }

  requestCertificationWithToken(request: CreateTokenCertificationRequest): Observable<CertificationRequest> {
    return this.http.post<CertificationRequest>(`${this.apiUrl}/request-token`, request);
  }

  getAthleteCertifications(athleteId: string): Observable<CertificationRequest[]> {
    return this.http.get<CertificationRequest[]>(`${this.apiUrl}/athlete/${athleteId}`);
  }

  getPublicCertificationByToken(token: string): Observable<PublicTokenCertificationResponse> {
    return this.http.get<PublicTokenCertificationResponse>(`${this.apiUrl}/token/${token}`);
  }

  submitTokenCertification(token: string, request: SubmitTokenCertificationRequest): Observable<CertificationRequest> {
    return this.http.post<CertificationRequest>(`${this.apiUrl}/token/${token}/submit`, request);
  }

  getPendingAdminCertifications(): Observable<CertificationRequest[]> {
    return this.http.get<CertificationRequest[]>(`${this.adminApiUrl}/pending`);
  }

  adminReviewCertification(id: string, request: AdminReviewCertificationRequest): Observable<CertificationRequest> {
    return this.http.post<CertificationRequest>(`${this.adminApiUrl}/${id}/review`, request);
  }
}
