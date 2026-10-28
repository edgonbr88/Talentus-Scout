import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { tutorGuard } from './tutor.guard';
import { AuthService } from './auth.service';
import { signal } from '@angular/core';

describe('tutorGuard', () => {
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(() => {
    mockAuthService = jasmine.createSpyObj('AuthService', [], {
      isAdmin: signal(false),
      isScout: signal(false),
      isTutor: signal(false)
    });
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    });
  });

  it('debe redirigir a /admin/scouts cuando el usuario tiene rol ADMIN', () => {
    (mockAuthService.isAdmin as any).set(true);

    const result = TestBed.runInInjectionContext(() => tutorGuard({} as any, {} as any));
    expect(result).toBeFalse();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/admin/scouts']);
  });

  it('debe redirigir a /scout/directory cuando el usuario tiene rol SCOUT', () => {
    (mockAuthService.isScout as any).set(true);

    const result = TestBed.runInInjectionContext(() => tutorGuard({} as any, {} as any));
    expect(result).toBeFalse();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/scout/directory']);
  });

  it('debe permitir acceso cuando el usuario tiene rol TUTOR', () => {
    (mockAuthService.isTutor as any).set(true);
    (mockAuthService.isAdmin as any).set(false);
    (mockAuthService.isScout as any).set(false);

    const result = TestBed.runInInjectionContext(() => tutorGuard({} as any, {} as any));
    expect(result).toBeTrue();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });
});
