import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScoutPendingAuditComponent } from './scout-pending-audit.component';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { signal } from '@angular/core';
import { User } from '../../../core/models/user.model';

describe('ScoutPendingAuditComponent', () => {
  let component: ScoutPendingAuditComponent;
  let fixture: ComponentFixture<ScoutPendingAuditComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let currentUserSignal: any;
  let isAuthSignal: any;
  let isScoutSignal: any;
  let isVerifiedScoutSignal: any;

  beforeEach(async () => {
    currentUserSignal = signal<User | null>(null);
    isAuthSignal = signal(false);
    isScoutSignal = signal(false);
    isVerifiedScoutSignal = signal(false);

    mockAuthService = jasmine.createSpyObj('AuthService', [
      'fetchCurrentUser',
      'reUploadScoutCredentials',
      'logout'
    ], {
      currentUser: currentUserSignal,
      isAuthenticated: isAuthSignal,
      isScout: isScoutSignal,
      isVerifiedScout: isVerifiedScoutSignal
    });

    mockAuthService.fetchCurrentUser.and.returnValue(of({} as any));
    mockAuthService.reUploadScoutCredentials.and.returnValue(of({
      message: 'Credenciales actualizadas exitosamente',
      verificationStatus: 'PENDING',
      credentialsDocumentUrl: 'https://storage/new.pdf'
    }));

    await TestBed.configureTestingModule({
      imports: [ScoutPendingAuditComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({ email: 'scout@caracasfc.org', org: 'Caracas FC' })
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ScoutPendingAuditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse y capturar queryParams de correo y organización en estado pendiente', () => {
    expect(component).toBeTruthy();
    expect(component.scoutEmail).toBe('scout@caracasfc.org');
    expect(component.organizationName).toBe('Caracas FC');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Caracas FC');
    expect(compiled.textContent).toContain('scout@caracasfc.org');
    expect(compiled.textContent).toContain('24 a 48 horas hábiles');
  });

  it('debe mostrar vista de subsanación cuando el scout está en estado REJECTED', () => {
    currentUserSignal.set({
      id: 'scout-1',
      email: 'scout@caracasfc.org',
      fullName: 'Scout Rechazado',
      role: 'SCOUT',
      scoutVerificationStatus: 'REJECTED',
      rejectionReason: 'La credencial consignada se encuentra vencida.'
    });
    fixture.detectChanges();

    expect(component.isRejected()).toBeTrue();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('SUBSANACIÓN DE CREDENCIAL REQUERIDA');
    expect(compiled.textContent).toContain('La credencial consignada se encuentra vencida.');
    expect(compiled.textContent).toContain('Reenviar Credencial para Nueva Auditoría');
  });

  it('debe validar formato y tamaño al seleccionar un archivo', () => {
    // Archivo con formato inválido
    const invalidFile = new File(['dummy'], 'credencial.exe', { type: 'application/octet-stream' });
    const eventInvalid = { target: { files: [invalidFile] } } as any;
    component.onFileSelected(eventInvalid);
    expect(component.fileError()).toContain('Formato de archivo no soportado');
    expect(component.selectedFile()).toBeNull();

    // Archivo válido
    const validFile = new File(['dummy content'], 'credencial_2026.pdf', { type: 'application/pdf' });
    const eventValid = { target: { files: [validFile] } } as any;
    component.onFileSelected(eventValid);
    expect(component.fileError()).toBeNull();
    expect(component.selectedFile()).toBe(validFile);
  });

  it('debe enviar la nueva credencial e invocar reUploadScoutCredentials', () => {
    currentUserSignal.set({
      id: 'scout-1',
      email: 'scout@caracasfc.org',
      fullName: 'Scout Rechazado',
      role: 'SCOUT',
      scoutVerificationStatus: 'REJECTED',
      rejectionReason: 'Falta sello oficial.'
    });
    fixture.detectChanges();

    const validFile = new File(['valid pdf content'], 'carnet_actualizado.pdf', { type: 'application/pdf' });
    component.selectedFile.set(validFile);

    component.submitRemediation();
    expect(mockAuthService.reUploadScoutCredentials).toHaveBeenCalled();
    expect(component.uploadSuccessMessage()).toContain('Credenciales actualizadas exitosamente');
    expect(component.selectedFile()).toBeNull();
  });

  it('debe mostrar vista de acreditación verificada cuando el scout está en estado APPROVED', () => {
    currentUserSignal.set({
      id: 'scout-1',
      email: 'scout@caracasfc.org',
      fullName: 'Scout Aprobado',
      role: 'SCOUT',
      scoutVerificationStatus: 'APPROVED'
    });
    isVerifiedScoutSignal.set(true);
    fixture.detectChanges();

    expect(component.isApproved()).toBeTrue();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('ACREDITACIÓN OFICIAL VERIFICADA');
    expect(compiled.textContent).toContain('Ingresar al Directorio de Talentos');
  });
});
