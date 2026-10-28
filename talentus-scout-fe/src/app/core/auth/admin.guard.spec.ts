import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { adminGuard } from './admin.guard';
import { AuthService } from './auth.service';
import { signal } from '@angular/core';

describe('adminGuard', () => {
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(() => {
    mockAuthService = jasmine.createSpyObj('AuthService', [], {
      isAuthenticated: signal(false),
      isAdmin: signal(false)
    });
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    });
  });

  it('debe permitir acceso cuando el usuario está autenticado y tiene rol ADMIN', () => {
    (mockAuthService.isAuthenticated as any).set(true);
    (mockAuthService.isAdmin as any).set(true);

    const result = TestBed.runInInjectionContext(() => adminGuard({} as any, {} as any));
    expect(result).toBeTrue();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('debe redirigir a /login cuando el usuario no está autenticado', () => {
    (mockAuthService.isAuthenticated as any).set(false);
    (mockAuthService.isAdmin as any).set(false);

    const result = TestBed.runInInjectionContext(() => adminGuard({} as any, {} as any));
    expect(result).toBeFalse();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('debe redirigir a /dashboard cuando el usuario está autenticado pero no es ADMIN', () => {
    (mockAuthService.isAuthenticated as any).set(true);
    (mockAuthService.isAdmin as any).set(false);

    const result = TestBed.runInInjectionContext(() => adminGuard({} as any, {} as any));
    expect(result).toBeFalse();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
  });
});
