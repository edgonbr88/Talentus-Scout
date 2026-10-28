import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VerifyEmailComponent } from './verify-email.component';
import { AuthService } from '../../../core/auth/auth.service';
import { ActivatedRoute, convertToParamMap, Router, provideRouter } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';
import { of, throwError } from 'rxjs';
import { AuthResponse } from '../../../core/models/auth.model';

describe('VerifyEmailComponent (TS-40 SSR Verification & Manual Redirect)', () => {
  let component: VerifyEmailComponent;
  let fixture: ComponentFixture<VerifyEmailComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let router: Router;

  const setupTestBed = async (platform: 'browser' | 'server', queryParams: Record<string, string> = {}) => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['verifyEmail']);

    await TestBed.configureTestingModule({
      imports: [VerifyEmailComponent],
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: platform },
        { provide: AuthService, useValue: authServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap(queryParams)
            }
          }
        }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    fixture = TestBed.createComponent(VerifyEmailComponent);
    component = fixture.componentInstance;
  };

  describe('Server-Side Rendering (SSR) Guard', () => {
    beforeEach(async () => {
      await setupTestBed('server', { token: 'valid-secret-token' });
      fixture.detectChanges();
    });

    it('should stay in loading state and NEVER invoke verifyEmail during SSR', () => {
      expect(authServiceSpy.verifyEmail).not.toHaveBeenCalled();
      expect(component.isLoading()).toBeTrue();
      expect(component.isSuccess()).toBeFalse();
      expect(component.errorMessage()).toBeNull();

      const el = fixture.nativeElement;
      expect(el.querySelector('.spinner-radar')).toBeTruthy();
      expect(el.querySelector('.title')?.textContent).toContain('Verificando tu Cuenta Oficial');
      expect(el.querySelector('.success-title')).toBeNull();
      expect(el.querySelector('.error-title')).toBeNull();
    });
  });

  describe('Browser Environment Execution', () => {
    it('should display error when no token is provided in query params', async () => {
      await setupTestBed('browser', {});
      fixture.detectChanges();

      expect(authServiceSpy.verifyEmail).not.toHaveBeenCalled();
      expect(component.isLoading()).toBeFalse();
      expect(component.isSuccess()).toBeFalse();
      expect(component.errorMessage()).toContain('No se proporcionó un token de verificación válido');

      const el = fixture.nativeElement;
      expect(el.querySelector('.error-title')?.textContent).toContain('Enlace no Válido o Expirado');
      expect(el.querySelector('.subtitle')?.textContent).toContain('No se proporcionó un token');
    });

    it('should verify token, show success, and NOT automatically redirect', async () => {
      await setupTestBed('browser', { token: 'valid-token-123' });
      const mockAuthResponse: AuthResponse = {
        token: 'jwt-returned',
        tokenType: 'Bearer',
        expiresIn: 86400,
        userId: 'usr-123',
        email: 'tutor@talentus.app',
        fullName: 'Tutor Valido',
        role: 'TUTOR'
      };
      authServiceSpy.verifyEmail.and.returnValue(of(mockAuthResponse));

      fixture.detectChanges();

      expect(authServiceSpy.verifyEmail).toHaveBeenCalledWith('valid-token-123');
      expect(component.isLoading()).toBeFalse();
      expect(component.isSuccess()).toBeTrue();
      expect(component.errorMessage()).toBeNull();

      const el = fixture.nativeElement;
      expect(el.querySelector('.success-title')?.textContent).toContain('¡Cuenta Activada con Éxito!');
      expect(el.querySelector('.redirect-notice')).toBeNull();

      const dashboardBtn: HTMLButtonElement = el.querySelector('.btn-primary');
      expect(dashboardBtn).toBeTruthy();
      expect(dashboardBtn.textContent).toContain('Ir a mi Panel Ahora');

      dashboardBtn.click();
      expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    });

    it('should display error message returned by backend when token is invalid or expired', async () => {
      await setupTestBed('browser', { token: 'expired-token-456' });
      authServiceSpy.verifyEmail.and.returnValue(throwError(() => ({
        error: { message: 'El token ha expirado. Por favor solicita uno nuevo.' }
      })));

      fixture.detectChanges();

      expect(authServiceSpy.verifyEmail).toHaveBeenCalledWith('expired-token-456');
      expect(component.isLoading()).toBeFalse();
      expect(component.isSuccess()).toBeFalse();
      expect(component.errorMessage()).toBe('El token ha expirado. Por favor solicita uno nuevo.');

      const el = fixture.nativeElement;
      expect(el.querySelector('.error-title')?.textContent).toContain('Enlace no Válido o Expirado');
      expect(el.querySelector('.subtitle')?.textContent).toContain('El token ha expirado');
      expect(el.querySelector('a[routerLink="/auth/verify-email-pending"]')).toBeTruthy();
      expect(el.querySelector('a[routerLink="/login"]')).toBeTruthy();
    });
  });
});
