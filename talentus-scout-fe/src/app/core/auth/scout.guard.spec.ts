import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { scoutGuard } from './scout.guard';
import { AuthService } from './auth.service';
import { signal } from '@angular/core';

describe('scoutGuard', () => {
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(() => {
    mockAuthService = jasmine.createSpyObj('AuthService', [], {
      isAuthenticated: signal(false),
      isScout: signal(false),
      canAccessDirectory: signal(false)
    });
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    });
  });

  it('debe permitir acceso cuando el usuario está autenticado y tiene acceso al directorio', () => {
    (mockAuthService.isAuthenticated as any).set(true);
    (mockAuthService.canAccessDirectory as any).set(true);

    const result = TestBed.runInInjectionContext(() => scoutGuard({} as any, {} as any));
    expect(result).toBeTrue();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('debe redirigir a /login cuando el usuario no está autenticado', () => {
    (mockAuthService.isAuthenticated as any).set(false);
    (mockAuthService.canAccessDirectory as any).set(false);

    const result = TestBed.runInInjectionContext(() => scoutGuard({} as any, {} as any));
    expect(result).toBeFalse();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('debe redirigir a /auth/scout-pending-audit cuando el usuario es scout autenticado pero sin acceso al directorio', () => {
    (mockAuthService.isAuthenticated as any).set(true);
    (mockAuthService.isScout as any).set(true);
    (mockAuthService.canAccessDirectory as any).set(false);

    const result = TestBed.runInInjectionContext(() => scoutGuard({} as any, {} as any));
    expect(result).toBeFalse();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/scout-pending-audit']);
  });

  it('debe redirigir a /dashboard cuando el usuario autenticado no es scout y no tiene acceso al directorio', () => {
    (mockAuthService.isAuthenticated as any).set(true);
    (mockAuthService.isScout as any).set(false);
    (mockAuthService.canAccessDirectory as any).set(false);

    const result = TestBed.runInInjectionContext(() => scoutGuard({} as any, {} as any));
    expect(result).toBeFalse();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
  });
});
