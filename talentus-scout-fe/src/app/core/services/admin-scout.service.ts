import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Page, PendingScout, ReviewScoutRequest, ScoutReviewResponse } from '../models/admin-scout.model';

@Injectable({
  providedIn: 'root'
})
export class AdminScoutService {
  private http = inject(HttpClient);

  getPendingScouts(page = 0, size = 20): Observable<Page<PendingScout>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<Page<PendingScout>>('/api/v1/admin/scouts/pending', { params });
  }

  reviewScout(scoutProfileId: string, request: ReviewScoutRequest): Observable<ScoutReviewResponse> {
    return this.http.post<ScoutReviewResponse>(`/api/v1/admin/scouts/${scoutProfileId}/review`, request);
  }
}
