import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  LegalVerificationItem,
  LegalVerificationReviewResponse,
  Page,
  ReviewLegalVerificationRequest,
  VerificationMetrics
} from '../models/admin-legal-verification.model';

@Injectable({
  providedIn: 'root'
})
export class AdminLegalVerificationService {
  private http = inject(HttpClient);

  getPendingVerifications(page = 0, size = 20): Observable<Page<LegalVerificationItem>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<Page<LegalVerificationItem>>('/api/v1/admin/legal-verifications/pending', { params });
  }

  getVerificationMetrics(): Observable<VerificationMetrics> {
    return this.http.get<VerificationMetrics>('/api/v1/admin/legal-verifications/metrics');
  }

  getVerificationDetail(athleteId: string): Observable<LegalVerificationItem> {
    return this.http.get<LegalVerificationItem>(`/api/v1/admin/legal-verifications/${athleteId}`);
  }

  reviewVerification(athleteId: string, request: ReviewLegalVerificationRequest): Observable<LegalVerificationReviewResponse> {
    return this.http.post<LegalVerificationReviewResponse>(`/api/v1/admin/legal-verifications/${athleteId}/review`, request);
  }
}
