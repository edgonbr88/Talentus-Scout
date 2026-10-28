import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegisterScoutComponent } from './register-scout.component';
import { AuthService } from '../../../core/auth/auth.service';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AthleteService } from '../../../core/services/athlete.service';
import { ClubDto } from '../../../core/models/athlete.model';

describe('RegisterScoutComponent', () => {
  let component: RegisterScoutComponent;
  let fixture: ComponentFixture<RegisterScoutComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let athleteServiceSpy: jasmine.SpyObj<AthleteService>;
  let router: Router;

  const mockClub: ClubDto = {
    id: 'club-123',
    name: 'Caracas FC',
    city: 'Caracas',
    state: 'Distrito Capital',
    country: 'Venezuela',
    verifiedOfficial: true
  };

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['registerScout']);
    athleteServiceSpy = jasmine.createSpyObj('AthleteService', ['getClubs']);
    athleteServiceSpy.getClubs.and.returnValue(of([mockClub]));

    await TestBed.configureTestingModule({
      imports: [RegisterScoutComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: AthleteService, useValue: athleteServiceSpy }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');

    fixture = TestBed.createComponent(RegisterScoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse e inicializar el formulario inválido por defecto', () => {
    expect(component).toBeTruthy();
    expect(component.registerForm.valid).toBeFalse();
    expect(component.selectedFile).toBeNull();
  });

  it('debe validar formato internacional en phoneNumber', () => {
    const phoneControl = component.registerForm.get('phoneNumber');
    phoneControl?.setValue('04121234567');
    expect(phoneControl?.valid).toBeFalse();

    phoneControl?.setValue('+584121234567');
    expect(phoneControl?.valid).toBeTrue();
  });

  it('debe activar campo personalizado si se selecciona el rol "Otro"', () => {
    const selectEvent = {
      target: { value: 'Otro' }
    } as unknown as Event;

    component.onRoleChange(selectEvent);
    expect(component.showCustomRoleInput).toBeTrue();
    expect(component.registerForm.get('customScoutRole')?.validator).toBeTruthy();

    const normalEvent = {
      target: { value: 'Reclutador Oficial' }
    } as unknown as Event;
    component.onRoleChange(normalEvent);
    expect(component.showCustomRoleInput).toBeFalse();
  });

  it('debe rechazar archivo mayor a 10MB', () => {
    const largeBlob = new Blob([new Uint8Array(11 * 1024 * 1024)], { type: 'application/pdf' });
    const largeFile = new File([largeBlob], 'credencial_pesada.pdf', { type: 'application/pdf' });

    const event = {
      target: { files: [largeFile] }
    } as unknown as Event;

    component.onFileSelected(event);
    expect(component.selectedFile).toBeNull();
    expect(component.fileError).toContain('supera el tamaño máximo');
  });

  it('debe aceptar credencial válida en PDF o imagen', () => {
    const file = new File(['dummy content'], 'credencial.pdf', { type: 'application/pdf' });
    const event = {
      target: { files: [file] }
    } as unknown as Event;

    component.onFileSelected(event);
    expect(component.selectedFile).toBe(file);
    expect(component.fileError).toBeNull();
  });

  it('debe enviar el formulario válido con club oficial y redirigir a auditoría pendiente', () => {
    const file = new File(['dummy content'], 'credencial.pdf', { type: 'application/pdf' });
    component.selectedFile = file;

    component.registerForm.setValue({
      fullName: 'Carlos Scout',
      email: 'scout@caracasfc.org',
      password: 'password123',
      phoneNumber: '+584120001122',
      organizationSelect: 'club-123',
      organizationName: 'Caracas FC',
      organizationClubId: 'club-123',
      customClubName: '',
      customClubCity: '',
      customClubState: '',
      customClubCountry: 'Venezuela',
      scoutRole: 'Reclutador Oficial',
      customScoutRole: '',
      linkedinUrl: 'https://linkedin.com/in/carlos-scout',
      acceptLegalNotice: true
    });

    authServiceSpy.registerScout.and.returnValue(of({
      scoutProfileId: 'scout-123',
      userId: 'user-123',
      token: 'jwt-token',
      role: 'SCOUT' as any,
      accountStatus: 'PENDING_VERIFICATION' as any,
      verificationStatus: 'PENDING' as any,
      email: 'scout@caracasfc.org',
      fullName: 'Carlos Scout',
      organizationName: 'Caracas FC',
      scoutRole: 'Reclutador Oficial'
    }));

    component.onSubmit();

    expect(authServiceSpy.registerScout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(
      ['/auth/scout-pending-audit'],
      jasmine.objectContaining({
        queryParams: {
          email: 'scout@caracasfc.org',
          org: 'Caracas FC'
        }
      })
    );
  });

  it('debe activar campos de organización personalizada si se selecciona "Otro"', () => {
    component.registerForm.get('organizationSelect')?.setValue('OTHER');

    expect(component.isOtherOrganizationSelected).toBeTrue();
    expect(component.registerForm.get('customClubName')?.validator).toBeTruthy();
    expect(component.registerForm.get('customClubCity')?.validator).toBeTruthy();
    expect(component.registerForm.get('customClubState')?.validator).toBeTruthy();
    expect(component.registerForm.get('customClubCountry')?.validator).toBeTruthy();

    component.registerForm.get('organizationSelect')?.setValue('INDEPENDENT');
    expect(component.isOtherOrganizationSelected).toBeFalse();
    expect(component.isIndependentSelected).toBeTrue();
    expect(component.registerForm.get('organizationName')?.value).toBe('Agente Independiente');
    expect(component.registerForm.get('customClubName')?.validator).toBeNull();
  });

  it('debe enviar datos geográficos completos cuando se selecciona "Otro"', () => {
    const file = new File(['dummy content'], 'credencial.pdf', { type: 'application/pdf' });
    component.selectedFile = file;

    component.registerForm.setValue({
      fullName: 'Ojeador Andes',
      email: 'scout@andes.com',
      password: 'password123',
      phoneNumber: '+584120001122',
      organizationSelect: 'OTHER',
      organizationName: '',
      organizationClubId: '',
      customClubName: 'Academia Los Andes',
      customClubCity: 'Mérida',
      customClubState: 'Mérida',
      customClubCountry: 'Venezuela',
      scoutRole: 'Director Deportivo',
      customScoutRole: '',
      linkedinUrl: '',
      acceptLegalNotice: true
    });

    authServiceSpy.registerScout.and.returnValue(of({
      scoutProfileId: 'scout-456',
      userId: 'user-456',
      token: 'jwt-token',
      role: 'SCOUT' as any,
      accountStatus: 'PENDING_VERIFICATION' as any,
      verificationStatus: 'PENDING' as any,
      email: 'scout@andes.com',
      fullName: 'Ojeador Andes',
      organizationName: 'Academia Los Andes',
      scoutRole: 'Director Deportivo'
    }));

    component.onSubmit();

    expect(authServiceSpy.registerScout).toHaveBeenCalled();
    const sentFormData = authServiceSpy.registerScout.calls.mostRecent().args[0] as FormData;
    expect(sentFormData.get('organizationName')).toBe('Academia Los Andes');
    expect(sentFormData.get('customClubCity')).toBe('Mérida');
    expect(sentFormData.get('customClubState')).toBe('Mérida');
    expect(sentFormData.get('customClubCountry')).toBe('Venezuela');
  });

  it('debe manejar error 409 por conflicto de correo electrónico', () => {
    const file = new File(['dummy content'], 'credencial.pdf', { type: 'application/pdf' });
    component.selectedFile = file;

    component.registerForm.setValue({
      fullName: 'Carlos Scout',
      email: 'duplicado@club.com',
      password: 'password123',
      phoneNumber: '+584120001122',
      organizationSelect: 'club-123',
      organizationName: 'Caracas FC',
      organizationClubId: 'club-123',
      customClubName: '',
      customClubCity: '',
      customClubState: '',
      customClubCountry: 'Venezuela',
      scoutRole: 'Reclutador Oficial',
      customScoutRole: '',
      linkedinUrl: '',
      acceptLegalNotice: true
    });

    authServiceSpy.registerScout.and.returnValue(throwError(() => ({ status: 409 })));

    component.onSubmit();

    expect(component.isLoading).toBeFalse();
    expect(component.conflictEmail).toBe('duplicado@club.com');
    expect(component.errorMessage).toContain('Ya existe un usuario registrado');
  });
});
