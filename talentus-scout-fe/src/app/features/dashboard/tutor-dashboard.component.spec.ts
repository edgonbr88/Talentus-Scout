import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';
import { TutorDashboardComponent } from './tutor-dashboard.component';
import { AuthService } from '../../core/auth/auth.service';
import { AthleteService } from '../../core/services/athlete.service';
import { VideoUploadService } from '../../core/services/video-upload.service';
import { AthleteSummary } from '../../core/models/athlete.model';
import { signal } from '@angular/core';

describe('TutorDashboardComponent - TS-29 Video Upload Restrictions', () => {
  let component: TutorDashboardComponent;
  let fixture: ComponentFixture<TutorDashboardComponent>;
  let athleteServiceSpy: jasmine.SpyObj<AthleteService>;
  let videoUploadServiceSpy: jasmine.SpyObj<VideoUploadService>;
  let authServiceMock: Partial<AuthService>;

  const mockAthlete1: AthleteSummary = {
    id: 'ath-001',
    firstName: 'Carlos',
    lastName: 'Gomez',
    fullName: 'Carlos Gomez',
    birthDate: '2010-06-15',
    age: 16,
    primaryPosition: 'Extremo Izquierdo',
    preferredFoot: 'Izquierda',
    slug: 'carlos-gomez',
    profilePhotoUrl: undefined,
    isPublic: true,
    subscriptionStatus: 'ACTIVE',
    hasIdentityDocument: true,
    legalVerificationStatus: 'APPROVED'
  };

  const mockAthlete2: AthleteSummary = {
    id: 'ath-002',
    firstName: 'Luis',
    lastName: 'Perez',
    fullName: 'Luis Perez',
    birthDate: '2011-04-10',
    age: 15,
    primaryPosition: 'Portero',
    preferredFoot: 'Derecha',
    slug: 'luis-perez',
    profilePhotoUrl: undefined,
    isPublic: true,
    subscriptionStatus: 'INACTIVE',
    hasIdentityDocument: false,
    legalVerificationStatus: 'PENDING_REVIEW'
  };

  beforeEach(async () => {
    athleteServiceSpy = jasmine.createSpyObj('AthleteService', [
      'getMyAthletes',
      'getTutorRadarMetrics',
      'downloadAthleteCvPdf',
      'uploadIdentityDocument',
      'uploadAthletePhoto',
      'deleteAthletePhoto'
    ]);
    videoUploadServiceSpy = jasmine.createSpyObj('VideoUploadService', [
      'getVideosByAthlete'
    ]);

    athleteServiceSpy.getMyAthletes.and.returnValue(of([]));
    athleteServiceSpy.getTutorRadarMetrics.and.returnValue(of(null as any));
    videoUploadServiceSpy.getVideosByAthlete.and.returnValue(of([]));

    authServiceMock = {
      currentUser: signal({
        id: 'usr-001',
        email: 'tutor@talentus.app',
        fullName: 'Tutor Responsable',
        role: 'TUTOR',
        status: 'ACTIVE'
      } as any),
      token: signal('fake-jwt-token'),
      logout: jasmine.createSpy('logout')
    };

    await TestBed.configureTestingModule({
      imports: [TutorDashboardComponent],
      providers: [
        provideRouter([]),
        { provide: AthleteService, useValue: athleteServiceSpy },
        { provide: VideoUploadService, useValue: videoUploadServiceSpy },
        { provide: AuthService, useValue: authServiceMock }
      ]
    }).compileComponents();
  });

  it('should disable the header upload button and not open modals when tutor has 0 athletes', () => {
    athleteServiceSpy.getMyAthletes.and.returnValue(of([]));
    fixture = TestBed.createComponent(TutorDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const uploadButton: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-upload-header');
    expect(uploadButton).toBeTruthy();
    expect(uploadButton.disabled).toBeTrue();
    expect(uploadButton.getAttribute('title')).toBe('Debes registrar al menos un atleta antes de subir videos');

    component.openQuickVideoUploader();
    expect(component.showVideoModal).toBeFalse();
    expect(component.showAthleteSelectorModal).toBeFalse();
    expect(component.activeAthleteId).toBe('');
  });

  it('should not contain any demo upload button in the empty state box', () => {
    athleteServiceSpy.getMyAthletes.and.returnValue(of([]));
    fixture = TestBed.createComponent(TutorDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const emptyBox: HTMLElement = fixture.nativeElement.querySelector('.empty-state-box');
    expect(emptyBox).toBeTruthy();

    const allButtons: HTMLButtonElement[] = Array.from(emptyBox.querySelectorAll('button'));
    const demoButton = allButtons.find(b => b.textContent?.includes('Demo') || b.textContent?.includes('Probar'));
    expect(demoButton).toBeUndefined();

    const registerButton = allButtons.find(b => b.textContent?.includes('Registrar Atleta'));
    expect(registerButton).toBeTruthy();
  });

  it('should directly open the video uploader modal for the single athlete when tutor has 1 athlete', () => {
    athleteServiceSpy.getMyAthletes.and.returnValue(of([mockAthlete1]));
    fixture = TestBed.createComponent(TutorDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const uploadButton: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-upload-header');
    expect(uploadButton.disabled).toBeFalse();

    component.openQuickVideoUploader();
    expect(component.showVideoModal).toBeTrue();
    expect(component.showAthleteSelectorModal).toBeFalse();
    expect(component.activeAthleteId).toBe(mockAthlete1.id);
    expect(component.activeAthleteName).toBe(mockAthlete1.fullName);
  });

  it('should open the quick athlete selector modal when tutor has more than 1 athlete', () => {
    athleteServiceSpy.getMyAthletes.and.returnValue(of([mockAthlete1, mockAthlete2]));
    fixture = TestBed.createComponent(TutorDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.openQuickVideoUploader();
    expect(component.showAthleteSelectorModal).toBeTrue();
    expect(component.showVideoModal).toBeFalse();

    fixture.detectChanges();

    // Verify selector modal elements
    const selectorModal = fixture.nativeElement.querySelector('.selector-modal');
    expect(selectorModal).toBeTruthy();

    const athleteOptions = fixture.nativeElement.querySelectorAll('.athlete-select-option');
    expect(athleteOptions.length).toBe(2);

    // Select first athlete (ACTIVE)
    component.selectAthleteForVideo(mockAthlete1);
    expect(component.showAthleteSelectorModal).toBeFalse();
    expect(component.showVideoModal).toBeTrue();
    expect(component.activeAthleteId).toBe(mockAthlete1.id);
    expect(component.activeAthleteName).toBe(mockAthlete1.fullName);
  });

  it('should redirect to checkout modal when selecting an athlete without active Pro subscription', () => {
    athleteServiceSpy.getMyAthletes.and.returnValue(of([mockAthlete1, mockAthlete2]));
    fixture = TestBed.createComponent(TutorDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.openQuickVideoUploader();
    expect(component.showAthleteSelectorModal).toBeTrue();

    // Select second athlete (INACTIVE)
    component.selectAthleteForVideo(mockAthlete2);
    expect(component.showAthleteSelectorModal).toBeFalse();
    expect(component.showVideoModal).toBeFalse();
    expect(component.showCheckoutModal).toBeTrue();
    expect(component.selectedAthleteForCheckout).toBe(mockAthlete2);
    expect(component.lastUploadedNotice).toContain('activa su membresía Pro');
  });

  it('should redirect to checkout modal when handleVideoUploadAction is called on inactive athlete', () => {
    athleteServiceSpy.getMyAthletes.and.returnValue(of([mockAthlete2]));
    fixture = TestBed.createComponent(TutorDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.handleVideoUploadAction(mockAthlete2);
    expect(component.showVideoModal).toBeFalse();
    expect(component.showCheckoutModal).toBeTrue();
    expect(component.selectedAthleteForCheckout).toBe(mockAthlete2);
  });

  it('should close the athlete selector modal when closeAthleteSelectorModal is invoked', () => {
    athleteServiceSpy.getMyAthletes.and.returnValue(of([mockAthlete1, mockAthlete2]));
    fixture = TestBed.createComponent(TutorDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.openQuickVideoUploader();
    expect(component.showAthleteSelectorModal).toBeTrue();

    component.closeAthleteSelectorModal();
    expect(component.showAthleteSelectorModal).toBeFalse();
  });

  describe('TS-35 Visual Reorganization and Bento Layout for Athlete Cards', () => {
    beforeEach(() => {
      athleteServiceSpy.getMyAthletes.and.returnValue(of([mockAthlete1, mockAthlete2]));
      fixture = TestBed.createComponent(TutorDashboardComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should render card-top-bar with title-with-badge and register button', () => {
      const topBar = fixture.nativeElement.querySelector('.card-top-bar');
      expect(topBar).toBeTruthy();

      const titleBadge = topBar.querySelector('.title-with-badge');
      expect(titleBadge).toBeTruthy();
      expect(titleBadge.querySelector('h3')?.textContent).toContain('Mis Atletas Representados');

      const countBadge = titleBadge.querySelector('.badge-official');
      expect(countBadge?.textContent).toContain('2 REGISTRADOS');

      const registerBtn = topBar.querySelector('button.btn-primary');
      expect(registerBtn?.textContent).toContain('Registrar Atleta');
    });

    it('should structure each athlete card into a 2-level layout: header row and actions bar', () => {
      const athleteCards = fixture.nativeElement.querySelectorAll('.athlete-card');
      expect(athleteCards.length).toBe(2);

      athleteCards.forEach((card: HTMLElement) => {
        const headerRow = card.querySelector('.athlete-header-row');
        expect(headerRow).withContext('Athlete header row (Level 1)').toBeTruthy();

        const actionsBar = card.querySelector('.athlete-actions-bar');
        expect(actionsBar).withContext('Athlete actions bar (Level 2)').toBeTruthy();

        // Level 1 components
        const avatar = headerRow?.querySelector('.athlete-avatar');
        expect(avatar).toBeTruthy();

        const mainInfo = headerRow?.querySelector('.athlete-main-info');
        expect(mainInfo).toBeTruthy();

        const nameEl = mainInfo?.querySelector('.athlete-name');
        expect(nameEl).toBeTruthy();
        expect(nameEl?.textContent?.trim().length).toBeGreaterThan(0);

        const badgesRow = mainInfo?.querySelector('.athlete-badges-row');
        expect(badgesRow).toBeTruthy();

        const specs = mainInfo?.querySelector('.athlete-specs');
        expect(specs).toBeTruthy();
      });
    });

    it('should display all 5 action buttons inside the dedicated .athlete-actions-bar', () => {
      const firstCard: HTMLElement = fixture.nativeElement.querySelector('.athlete-card');
      const actionsBar: HTMLElement = firstCard.querySelector('.athlete-actions-bar')!;
      expect(actionsBar).toBeTruthy();

      // Button 1: Pro Plan (Active for mockAthlete1 -> Renovar Pro)
      const proBtn = actionsBar.querySelector('.btn-action-pro');
      expect(proBtn).toBeTruthy();
      expect(proBtn?.textContent).toContain('Renovar Pro');

      // Button 2: Video Upload
      const videoBtn = actionsBar.querySelector('.btn-video');
      expect(videoBtn).toBeTruthy();
      expect(videoBtn?.textContent).toContain('Cargar Video');

      // Button 3: Certify
      const certifyBtn = actionsBar.querySelector('.btn-certify');
      expect(certifyBtn).toBeTruthy();
      expect(certifyBtn?.textContent).toContain('Certificar');

      // Button 4: Identity Document
      const docBtn = actionsBar.querySelector('.btn-doc');
      expect(docBtn).toBeTruthy();
      expect(docBtn?.textContent).toContain('Doc. Identidad');

      // Button 5: Download CV
      const cvBtn = actionsBar.querySelector('.btn-download-cv');
      expect(cvBtn).toBeTruthy();
      expect(cvBtn?.textContent).toContain('Descargar CV');
    });

    it('should show "Activar Plan Pro" button for athletes with inactive subscription', () => {
      const athleteCards = fixture.nativeElement.querySelectorAll('.athlete-card');
      const secondCard: HTMLElement = athleteCards[1]; // mockAthlete2 has INACTIVE
      const actionsBar: HTMLElement = secondCard.querySelector('.athlete-actions-bar')!;

      const proBtn = actionsBar.querySelector('.btn-action-pro');
      expect(proBtn).toBeTruthy();
      expect(proBtn?.textContent).toContain('Activar Plan Pro');
    });

    it('should properly render status badges in .athlete-badges-row for active and pending athletes', () => {
      const athleteCards = fixture.nativeElement.querySelectorAll('.athlete-card');
      
      // First card (mockAthlete1: ACTIVE, APPROVED)
      const firstBadgesRow: HTMLElement = athleteCards[0].querySelector('.athlete-badges-row')!;
      expect(firstBadgesRow.querySelector('.badge-pro-active')?.textContent).toContain('PRO ACTIVO');
      expect(firstBadgesRow.querySelector('.badge-legal-approved')?.textContent).toContain('PATRIA POTESTAD VERIFICADA');

      // Second card (mockAthlete2: INACTIVE, doc pending)
      const secondBadgesRow: HTMLElement = athleteCards[1].querySelector('.athlete-badges-row')!;
      expect(secondBadgesRow.querySelector('.badge-inactive')?.textContent).toContain('NO VISIBLE EN DIRECTORIO');
      expect(secondBadgesRow.querySelector('.badge-doc-pending')?.textContent).toContain('DOC. IDENTIDAD PENDIENTE');
    });
  });

  describe('TS-36 Dropzone with Drag & Drop for Athlete Identity Document', () => {
    beforeEach(() => {
      athleteServiceSpy.getMyAthletes.and.returnValue(of([mockAthlete1]));
      fixture = TestBed.createComponent(TutorDashboardComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
      component.openIdentityModal(mockAthlete1);
      fixture.detectChanges();
    });

    it('should render the styled .file-dropzone in empty state when opened without file', () => {
      const dropzone = fixture.nativeElement.querySelector('.file-dropzone');
      expect(dropzone).toBeTruthy();
      expect(dropzone.classList.contains('has-file')).toBeFalse();

      const emptyZone = dropzone.querySelector('.dropzone-empty');
      expect(emptyZone).toBeTruthy();
      expect(emptyZone.querySelector('.dropzone-text')?.textContent).toContain('Haz clic o arrastra tu documento aquí');
      expect(emptyZone.querySelector('.dropzone-hint')?.textContent).toContain('Formatos: JPG, PNG o PDF (Máximo 5MB)');
    });

    it('should update isDraggingDoc on dragover and dragleave events', () => {
      const dropzone: HTMLElement = fixture.nativeElement.querySelector('.file-dropzone');
      
      const dragOverEvent = new DragEvent('dragover', { cancelable: true });
      dropzone.dispatchEvent(dragOverEvent);
      fixture.detectChanges();

      expect(component.isDraggingDoc).toBeTrue();
      expect(dropzone.classList.contains('is-dragging')).toBeTrue();

      const dragLeaveEvent = new DragEvent('dragleave', { cancelable: true });
      dropzone.dispatchEvent(dragLeaveEvent);
      fixture.detectChanges();

      expect(component.isDraggingDoc).toBeFalse();
      expect(dropzone.classList.contains('is-dragging')).toBeFalse();
    });

    it('should handle valid file drop, update state to has-file and display file info', () => {
      const mockFile = new File(['dummy content pdf'], 'partida_nacimiento.pdf', { type: 'application/pdf' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(mockFile);

      const dropEvent = new DragEvent('drop', { cancelable: true, dataTransfer });
      const dropzone: HTMLElement = fixture.nativeElement.querySelector('.file-dropzone');
      dropzone.dispatchEvent(dropEvent);
      fixture.detectChanges();

      expect(component.identityFile).toBe(mockFile);
      expect(component.isDraggingDoc).toBeFalse();
      expect(dropzone.classList.contains('has-file')).toBeTrue();

      const fileZone = dropzone.querySelector('.dropzone-file');
      expect(fileZone).toBeTruthy();
      expect(fileZone?.querySelector('.file-name')?.textContent).toBe('partida_nacimiento.pdf');
    });

    it('should reject files exceeding 5MB and display error message', () => {
      const largeFile = new File([new ArrayBuffer(6 * 1024 * 1024)], 'foto_pesada.jpg', { type: 'image/jpeg' });
      component.handleIdentityFile(largeFile);
      fixture.detectChanges();

      expect(component.identityFile).toBeNull();
      expect(component.identityUploadError).toContain('(6.0 MB) supera el límite máximo permitido de 5MB');

      const dropzone: HTMLElement = fixture.nativeElement.querySelector('.file-dropzone');
      expect(dropzone.classList.contains('is-invalid')).toBeTrue();

      const errorEl = fixture.nativeElement.querySelector('.form-error');
      expect(errorEl?.textContent).toContain('(6.0 MB) supera el límite máximo permitido de 5MB');
    });

    it('should reject files with unsupported extensions', () => {
      const exeFile = new File(['malicious'], 'documento.exe', { type: 'application/x-msdownload' });
      component.handleIdentityFile(exeFile);
      fixture.detectChanges();

      expect(component.identityFile).toBeNull();
      expect(component.identityUploadError).toContain('Formato no permitido');
    });

    it('should remove the file and clear state when removeIdentityFile is called', () => {
      const validFile = new File(['valid'], 'cedula.png', { type: 'image/png' });
      component.handleIdentityFile(validFile);
      fixture.detectChanges();

      expect(component.identityFile).toBe(validFile);

      const removeBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-remove-file');
      expect(removeBtn).toBeTruthy();
      removeBtn.click();
      fixture.detectChanges();

      expect(component.identityFile).toBeNull();
      expect(fixture.nativeElement.querySelector('.dropzone-empty')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.dropzone-file')).toBeNull();
    });

    it('should call athleteService.uploadIdentityDocument when saveIdentityDocument is executed', () => {
      const validFile = new File(['valid'], 'cedula.png', { type: 'image/png' });
      component.handleIdentityFile(validFile);
      component.identityDocType = 'CEDULA';
      component.identityDocNumber = 'V-31222333';
      fixture.detectChanges();

      athleteServiceSpy.uploadIdentityDocument.and.returnValue(of({ ...mockAthlete1, hasIdentityDocument: true }));

      component.saveIdentityDocument();

      expect(athleteServiceSpy.uploadIdentityDocument).toHaveBeenCalledWith(mockAthlete1.id, jasmine.any(FormData));
      expect(component.showIdentityModal).toBeFalse();
    });
  });

  describe('TS-37 File size validation and incomplete save blocking', () => {
    beforeEach(() => {
      athleteServiceSpy.getMyAthletes.and.returnValue(of([mockAthlete1]));
      fixture = TestBed.createComponent(TutorDashboardComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
      component.openIdentityModal(mockAthlete1);
      fixture.detectChanges();
    });

    it('should calculate canSaveIdentityDocument accurately based on all 3 conditions', () => {
      const validFile = new File(['valid'], 'cedula.png', { type: 'image/png' });

      // Initially empty docNumber and no file
      expect(component.canSaveIdentityDocument).toBeFalse();

      // With only file
      component.handleIdentityFile(validFile);
      expect(component.canSaveIdentityDocument).toBeFalse();

      // With file and spaces-only docNumber
      component.identityDocNumber = '   ';
      expect(component.canSaveIdentityDocument).toBeFalse();

      // With valid docNumber
      component.identityDocNumber = 'V-28111222';
      expect(component.canSaveIdentityDocument).toBeTrue();

      // While uploading
      component.isUploadingIdentity = true;
      expect(component.canSaveIdentityDocument).toBeFalse();
      component.isUploadingIdentity = false;

      // Without docType
      component.identityDocType = '';
      expect(component.canSaveIdentityDocument).toBeFalse();
    });

    it('should keep Guardar Documento Legal button disabled until canSaveIdentityDocument is true', () => {
      const footerButtons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('.modal-footer button');
      const saveBtn: HTMLButtonElement = footerButtons[1];
      expect(saveBtn).toBeTruthy();
      expect(saveBtn.textContent).toContain('Guardar Documento Legal');
      expect(saveBtn.disabled).toBeTrue();

      // Set valid data
      const validFile = new File(['valid'], 'cedula.png', { type: 'image/png' });
      component.handleIdentityFile(validFile);
      component.identityDocNumber = 'V-28111222';
      fixture.detectChanges();

      expect(component.canSaveIdentityDocument).toBeTrue();
      expect(saveBtn.disabled).toBeFalse();

      // Blank out doc number
      component.identityDocNumber = '  ';
      fixture.detectChanges();
      expect(component.canSaveIdentityDocument).toBeFalse();
      expect(saveBtn.disabled).toBeTrue();
    });

    it('should format file size dynamically when file exceeds 5MB', () => {
      const file7_5Mb = new File([new ArrayBuffer(Math.round(7.5 * 1024 * 1024))], 'pesado.pdf', { type: 'application/pdf' });
      component.handleIdentityFile(file7_5Mb);
      fixture.detectChanges();

      expect(component.identityFile).toBeNull();
      expect(component.identityUploadError).toBe(
        'El archivo seleccionado (7.5 MB) supera el límite máximo permitido de 5MB. Por favor selecciona un documento más liviano o comprimido.'
      );
    });
  });

  describe('TS-38 Responsive height, internal scroll, and background scroll lock', () => {
    beforeEach(() => {
      athleteServiceSpy.getMyAthletes.and.returnValue(of([mockAthlete1]));
      fixture = TestBed.createComponent(TutorDashboardComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    afterEach(() => {
      document.body.style.overflow = '';
    });

    it('should lock document body scroll on openIdentityModal and restore it on closeIdentityModal', () => {
      expect(document.body.style.overflow).toBe('');

      component.openIdentityModal(mockAthlete1);
      expect(document.body.style.overflow).toBe('hidden');

      component.closeIdentityModal();
      expect(document.body.style.overflow).toBe('');
    });

    it('should restore document body scroll when component is destroyed (ngOnDestroy)', () => {
      component.openIdentityModal(mockAthlete1);
      expect(document.body.style.overflow).toBe('hidden');

      component.ngOnDestroy();
      expect(document.body.style.overflow).toBe('');
    });

    it('should render .identity-modal-box with structured header, body, and footer containers', () => {
      component.openIdentityModal(mockAthlete1);
      fixture.detectChanges();

      const modalBox: HTMLElement = fixture.nativeElement.querySelector('.identity-modal-box');
      expect(modalBox).toBeTruthy();

      const header = modalBox.querySelector('.modal-header');
      expect(header).toBeTruthy();

      const body = modalBox.querySelector('.modal-body');
      expect(body).toBeTruthy();

      const footer = modalBox.querySelector('.modal-footer');
      expect(footer).toBeTruthy();
    });
  });

  describe('TS-39 Global visibility banner and contextual checklist in tutor dashboard', () => {
    beforeEach(() => {
      athleteServiceSpy.getMyAthletes.and.returnValue(of([mockAthlete1, mockAthlete2]));
      fixture = TestBed.createComponent(TutorDashboardComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should correctly evaluate isAthleteVisible for different athlete states', () => {
      expect(component.isAthleteVisible(mockAthlete1)).toBeTrue();
      expect(component.isAthleteVisible(mockAthlete2)).toBeFalse();

      const athleteProOnly: AthleteSummary = {
        ...mockAthlete1,
        subscriptionStatus: 'ACTIVE',
        hasIdentityDocument: false
      };
      expect(component.isAthleteVisible(athleteProOnly)).toBeFalse();

      const athleteDocOnly: AthleteSummary = {
        ...mockAthlete1,
        subscriptionStatus: 'INACTIVE',
        hasIdentityDocument: true
      };
      expect(component.isAthleteVisible(athleteDocOnly)).toBeFalse();
    });

    it('should compute hasNonVisibleAthletes and getNonVisibleCount correctly', () => {
      expect(component.hasNonVisibleAthletes()).toBeTrue();
      expect(component.getNonVisibleCount()).toBe(1);

      // When all athletes are visible
      component.athletes = [mockAthlete1];
      expect(component.hasNonVisibleAthletes()).toBeFalse();
      expect(component.getNonVisibleCount()).toBe(0);

      // When no athletes exist
      component.athletes = [];
      expect(component.hasNonVisibleAthletes()).toBeFalse();
      expect(component.getNonVisibleCount()).toBe(0);
    });

    it('should render the global visibility banner when hasNonVisibleAthletes is true', () => {
      const banner = fixture.nativeElement.querySelector('.global-visibility-alert-banner');
      expect(banner).toBeTruthy();
      expect(banner.textContent).toContain('Atletas fuera del Directorio Nacional de Scouts');
      expect(banner.textContent).toContain('1 PENDIENTE');

      // Hide when all visible
      component.athletes = [mockAthlete1];
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.global-visibility-alert-banner')).toBeNull();
    });

    it('should render .visibility-checklist-card for non-visible athlete (mockAthlete2)', () => {
      const athleteCards: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.athlete-card');
      const secondCard = athleteCards[1];

      const checklist = secondCard.querySelector('.visibility-checklist-card');
      expect(checklist).toBeTruthy();
      expect(checklist?.textContent).toContain('Perfil Fuera del Radar de Scouts');
      expect(checklist?.textContent).toContain('Plan inactivo');
      expect(checklist?.textContent).toContain('Documento legal pendiente');

      const activateProBtn = checklist?.querySelector('.btn-activate-pro-checklist');
      expect(activateProBtn).toBeTruthy();

      const uploadDocBtn = checklist?.querySelector('.btn-upload-doc-checklist');
      expect(uploadDocBtn).toBeTruthy();
    });

    it('should render .visibility-status-active for fully visible athlete (mockAthlete1)', () => {
      const athleteCards: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.athlete-card');
      const firstCard = athleteCards[0];

      expect(firstCard.querySelector('.visibility-checklist-card')).toBeNull();
      const activeStatus = firstCard.querySelector('.visibility-status-active');
      expect(activeStatus).toBeTruthy();
      expect(activeStatus?.textContent).toContain('Ficha activa y visible en el Directorio Nacional de Scouts');
    });

    it('should open checkout modal and identity modal from checklist action buttons', () => {
      spyOn(component, 'openCheckoutModal');
      spyOn(component, 'openIdentityModal');

      const athleteCards: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.athlete-card');
      const secondCard = athleteCards[1];

      const activateBtn: HTMLButtonElement = secondCard.querySelector('.btn-activate-pro-checklist')!;
      activateBtn.click();
      expect(component.openCheckoutModal).toHaveBeenCalledWith(mockAthlete2);

      const uploadBtn: HTMLButtonElement = secondCard.querySelector('.btn-upload-doc-checklist')!;
      uploadBtn.click();
      expect(component.openIdentityModal).toHaveBeenCalledWith(mockAthlete2);
    });
  });

  describe('TS-41 Carga y Gestión de Foto de Perfil del Atleta', () => {
    beforeEach(() => {
      athleteServiceSpy.getMyAthletes.and.returnValue(of([mockAthlete1, mockAthlete2]));
      fixture = TestBed.createComponent(TutorDashboardComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should open photo modal when clicking on athlete avatar', () => {
      const avatarEl: HTMLElement = fixture.nativeElement.querySelector('.athlete-avatar-clickable');
      expect(avatarEl).toBeTruthy();

      avatarEl.click();
      fixture.detectChanges();

      expect(component.showPhotoModal).toBeTrue();
      expect(component.selectedAthleteForPhoto).toEqual(mockAthlete1);

      const modalTitle = fixture.nativeElement.querySelector('.photo-modal-box .modal-header h3');
      expect(modalTitle?.textContent).toContain('Fotografía de Perfil del Atleta');
    });

    it('should open photo modal when clicking on Foto Perfil action button', () => {
      const photoBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-photo');
      expect(photoBtn).toBeTruthy();

      photoBtn.click();
      fixture.detectChanges();

      expect(component.showPhotoModal).toBeTrue();
      expect(component.selectedAthleteForPhoto).toEqual(mockAthlete1);
    });

    it('should display LOPNNA Art. 65 legal disclaimer in photo modal', () => {
      component.openPhotoModal(mockAthlete1);
      fixture.detectChanges();

      const disclaimer = fixture.nativeElement.querySelector('.photo-legal-notice');
      expect(disclaimer).toBeTruthy();
      expect(disclaimer.textContent).toContain('LOPNNA Art. 65');
      expect(disclaimer.textContent).toContain('patria potestad');
    });

    it('should reject files exceeding 5MB or invalid extensions', () => {
      component.openPhotoModal(mockAthlete1);

      // Archivo no soportado (PDF)
      const invalidPdf = new File(['fake pdf'], 'doc.pdf', { type: 'application/pdf' });
      component.handlePhotoFile(invalidPdf);
      expect(component.photoUploadError).toContain('Formato no permitido');
      expect(component.photoFile).toBeNull();

      // Archivo mayor a 5MB
      const largeBytes = new Uint8Array(6 * 1024 * 1024);
      const largeFile = new File([largeBytes], 'huge.jpg', { type: 'image/jpeg' });
      component.handlePhotoFile(largeFile);
      expect(component.photoUploadError).toContain('supera los 5MB');
      expect(component.photoFile).toBeNull();
    });

    it('should upload valid photo and update athlete list', () => {
      const updatedMock: AthleteSummary = {
        ...mockAthlete1,
        profilePhotoUrl: '/uploads/photos/new-photo.jpg'
      };
      athleteServiceSpy.uploadAthletePhoto.and.returnValue(of(updatedMock));

      component.openPhotoModal(mockAthlete1);
      const validPhoto = new File(['valid png content'], 'player.png', { type: 'image/png' });
      component.handlePhotoFile(validPhoto);

      component.savePhoto();

      expect(athleteServiceSpy.uploadAthletePhoto).toHaveBeenCalledWith(mockAthlete1.id, validPhoto);
      expect(component.showPhotoModal).toBeFalse();
      expect(athleteServiceSpy.getMyAthletes).toHaveBeenCalled();
    });

    it('should delete photo and restore initial avatar', () => {
      const athleteWithPhoto: AthleteSummary = {
        ...mockAthlete1,
        profilePhotoUrl: '/uploads/photos/existing.jpg'
      };
      const athleteWithoutPhoto: AthleteSummary = {
        ...mockAthlete1,
        profilePhotoUrl: undefined
      };
      athleteServiceSpy.deleteAthletePhoto.and.returnValue(of(athleteWithoutPhoto));

      component.openPhotoModal(athleteWithPhoto);
      expect(component.selectedAthleteForPhoto?.profilePhotoUrl).toBe('/uploads/photos/existing.jpg');

      component.confirmDeletePhoto();
      expect(component.showDeletePhotoConfirm).toBeTrue();

      component.deletePhoto();

      expect(athleteServiceSpy.deleteAthletePhoto).toHaveBeenCalledWith(athleteWithPhoto.id);
      expect(component.showPhotoModal).toBeFalse();
      expect(athleteServiceSpy.getMyAthletes).toHaveBeenCalled();
    });
  });
});

