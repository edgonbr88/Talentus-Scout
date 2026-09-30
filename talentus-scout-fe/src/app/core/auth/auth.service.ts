import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { User } from '../models/user.model';
import {
  AuthResponse,
  LoginRequest,
  RegisterTutorRequest,
  RegisterTutorResponse,
  UserProfileResponse
} from '../models/auth.model';

const TOKEN_KEY = 'talentus_token';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  // Angular Signals para reactividad de estado de sesión
  readonly token = signal<string | null>(this.getStoredToken());
  readonly currentUser = signal<User | null>(null);

  readonly isAuthenticated = computed(() => !!this.token());
  readonly isTutor = computed(() => this.currentUser()?.role === 'TUTOR');
  readonly isAdmin = computed(() => this.currentUser()?.role === 'ADMIN');
  readonly isScout = computed(() => this.currentUser()?.role === 'SCOUT');

  constructor() {
    if (this.token()) {
      this.fetchCurrentUser().subscribe({
        error: () => this.logout()
      });
    }
  }

  private getStoredToken(): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(TOKEN_KEY);
    }
    return null;
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/v1/auth/login', credentials).pipe(
      tap((res) => {
        this.saveSession(res.token, {
          id: res.userId,
          email: res.email,
          fullName: res.fullName,
          role: res.role
        });
      })
    );
  }

  registerTutor(data: RegisterTutorRequest): Observable<RegisterTutorResponse> {
    return this.http.post<RegisterTutorResponse>('/api/v1/auth/register-tutor', data).pipe(
      tap((res) => {
        this.saveSession(res.token, {
          id: res.userId,
          email: res.email,
          fullName: res.fullName,
          role: res.role
        });
      })
    );
  }

  fetchCurrentUser(): Observable<UserProfileResponse> {
    return this.http.get<UserProfileResponse>('/api/v1/auth/me').pipe(
      tap((profile) => {
        this.currentUser.set({
          id: profile.id,
          email: profile.email,
          fullName: profile.fullName,
          phoneNumber: profile.phoneNumber,
          role: profile.role,
          status: profile.status
        });
      }),
      catchError((err) => {
        return throwError(() => err);
      })
    );
  }

  logout(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(TOKEN_KEY);
    }
    this.token.set(null);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  private saveSession(jwtToken: string, user: User): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(TOKEN_KEY, jwtToken);
    }
    this.token.set(jwtToken);
    this.currentUser.set(user);
  }
}
