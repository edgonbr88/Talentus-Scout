import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, switchMap, map, of } from 'rxjs';
import { User } from '../models/user.model';
import {
  AuthResponse,
  LoginRequest,
  RegisterTutorRequest,
  RegisterTutorResponse,
  RegisterScoutResponse,
  UserProfileResponse,
  SocialAuthRequest,
  SocialAuthResponse,
  CompleteProfileRequest,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse
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
  readonly needsProfileCompletion = computed(() => this.currentUser()?.isProfileCompleted === false);
  readonly isTutor = computed(() => this.currentUser()?.role === 'TUTOR');
  readonly isAdmin = computed(() => this.currentUser()?.role === 'ADMIN');
  readonly isScout = computed(() => this.currentUser()?.role === 'SCOUT');
  readonly isVerifiedScout = computed(() => 
    this.currentUser()?.role === 'SCOUT' && 
    (this.currentUser()?.scoutVerificationStatus === 'APPROVED' || this.currentUser()?.status === 'ACTIVE')
  );
  readonly canAccessDirectory = computed(() => this.isAdmin() || this.isVerifiedScout());

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
      }),
      switchMap((res) => this.fetchCurrentUser().pipe(
        map(() => res),
        catchError(() => of(res))
      ))
    );
  }

  reUploadScoutCredentials(data: FormData): Observable<{ message: string; verificationStatus: string; credentialsDocumentUrl: string }> {
    return this.http.post<{ message: string; verificationStatus: string; credentialsDocumentUrl: string }>('/api/v1/scout/re-upload-credentials', data).pipe(
      tap((res) => {
        const user = this.currentUser();
        if (user) {
          this.currentUser.set({
            ...user,
            scoutVerificationStatus: 'PENDING',
            rejectionReason: undefined
          });
        }
      })
    );
  }

  registerTutor(data: FormData): Observable<RegisterTutorResponse> {
    return this.http.post<RegisterTutorResponse>('/api/v1/auth/register-tutor', data);
  }

  registerScout(data: FormData): Observable<RegisterScoutResponse> {
    return this.http.post<RegisterScoutResponse>('/api/v1/auth/register-scout', data);
  }

  verifyEmail(token: string): Observable<AuthResponse> {
    return this.http.get<AuthResponse>(`/api/v1/auth/verify-email?token=${encodeURIComponent(token)}`).pipe(
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

  resendVerificationEmail(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>('/api/v1/auth/resend-verification-email', { email });
  }

  forgotPassword(email: string): Observable<ForgotPasswordResponse> {
    return this.http.post<ForgotPasswordResponse>('/api/v1/auth/forgot-password', { email });
  }

  resetPassword(payload: ResetPasswordRequest): Observable<ResetPasswordResponse> {
    return this.http.post<ResetPasswordResponse>('/api/v1/auth/reset-password', payload);
  }

  socialLoginGoogle(token: string, mockData?: { email?: string; name?: string }): Observable<SocialAuthResponse> {
    const payload: SocialAuthRequest = {
      token,
      mockEmail: mockData?.email,
      mockName: mockData?.name
    };
    return this.http.post<SocialAuthResponse>('/api/v1/auth/social/google', payload).pipe(
      tap((res) => {
        this.saveSession(res.token, {
          id: res.userId,
          email: res.email,
          fullName: res.fullName,
          role: res.role,
          isProfileCompleted: !res.needsProfileCompletion
        });
      }),
      switchMap((res) => {
        if (!res.needsProfileCompletion) {
          return this.fetchCurrentUser().pipe(
            map(() => res),
            catchError(() => of(res))
          );
        }
        return of(res);
      })
    );
  }

  socialLoginMicrosoft(token: string, mockData?: { email?: string; name?: string }): Observable<SocialAuthResponse> {
    const payload: SocialAuthRequest = {
      token,
      mockEmail: mockData?.email,
      mockName: mockData?.name
    };
    return this.http.post<SocialAuthResponse>('/api/v1/auth/social/microsoft', payload).pipe(
      tap((res) => {
        this.saveSession(res.token, {
          id: res.userId,
          email: res.email,
          fullName: res.fullName,
          role: res.role,
          isProfileCompleted: !res.needsProfileCompletion
        });
      }),
      switchMap((res) => {
        if (!res.needsProfileCompletion) {
          return this.fetchCurrentUser().pipe(
            map(() => res),
            catchError(() => of(res))
          );
        }
        return of(res);
      })
    );
  }

  completeProfile(data: CompleteProfileRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/v1/auth/social/complete-profile', data).pipe(
      tap((res) => {
        this.saveSession(res.token, {
          id: res.userId,
          email: res.email,
          fullName: res.fullName,
          role: res.role,
          isProfileCompleted: true
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
          status: profile.status,
          scoutVerificationStatus: profile.scoutVerificationStatus,
          rejectionReason: profile.rejectionReason,
          isProfileCompleted: profile.isProfileCompleted ?? true
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
