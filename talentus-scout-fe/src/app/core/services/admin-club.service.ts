import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AdminClub,
  AdminClubPage,
  ClubStats,
  CreateClubPayload,
  UpdateClubPayload
} from '../models/admin-club.model';

@Injectable({
  providedIn: 'root'
})
export class AdminClubService {
  private http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/admin/clubs';

  getClubs(search?: string, status?: string, page = 0, size = 20): Observable<AdminClubPage> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (search && search.trim()) {
      params = params.set('search', search.trim());
    }
    if (status && status !== 'ALL') {
      params = params.set('status', status);
    }

    return this.http.get<AdminClubPage>(this.baseUrl, { params });
  }

  getStats(): Observable<ClubStats> {
    return this.http.get<ClubStats>(`${this.baseUrl}/stats`);
  }

  getClub(id: string): Observable<AdminClub> {
    return this.http.get<AdminClub>(`${this.baseUrl}/${id}`);
  }

  createClub(payload: CreateClubPayload): Observable<AdminClub> {
    return this.http.post<AdminClub>(this.baseUrl, payload);
  }

  updateClub(id: string, payload: UpdateClubPayload): Observable<AdminClub> {
    return this.http.put<AdminClub>(`${this.baseUrl}/${id}`, payload);
  }

  toggleVerification(id: string, verifiedOfficial?: boolean): Observable<AdminClub> {
    const body = verifiedOfficial !== undefined ? { verifiedOfficial } : {};
    return this.http.patch<AdminClub>(`${this.baseUrl}/${id}/verify`, body);
  }

  uploadLogo(id: string, file: File): Observable<{ logoUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ logoUrl: string }>(`${this.baseUrl}/${id}/logo`, formData);
  }

  deleteClub(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
