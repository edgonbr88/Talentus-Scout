import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { RegisterAthleteModalComponent } from './register-athlete-modal.component';
import { AthleteService } from '../../../core/services/athlete.service';
import { AthleteSummary, ClubDto } from '../../../core/models/athlete.model';

describe('RegisterAthleteModalComponent - TS-41 Photo Upload', () => {
  let component: RegisterAthleteModalComponent;
  let fixture: ComponentFixture<RegisterAthleteModalComponent>;
  let athleteServiceSpy: jasmine.SpyObj<AthleteService>;

  const mockClub: ClubDto = {
    id: 'club-001',
    name: 'Caracas FC',
    city: 'Caracas',
    state: 'Distrito Capital'
  };

  const mockCreatedAthlete: AthleteSummary = {
    id: 'ath-new',
    firstName: 'Santiago',
    lastName: 'Rivas',
    fullName: 'Santiago Rivas',
    birthDate: '2012-04-10',
    age: 14,
    primaryPosition: 'Delantero Centro',
    preferredFoot: 'DERECHO',
    slug: 'santiago-rivas',
    profilePhotoUrl: undefined,
    isPublic: true
  };

  beforeEach(async () => {
    athleteServiceSpy = jasmine.createSpyObj('AthleteService', [
      'getClubs',
      'createAthlete',
      'uploadAthletePhoto'
    ]);

    athleteServiceSpy.getClubs.and.returnValue(of([mockClub]));
    athleteServiceSpy.createAthlete.and.returnValue(of(mockCreatedAthlete));
    athleteServiceSpy.uploadAthletePhoto.and.returnValue(of({
      ...mockCreatedAthlete,
      profilePhotoUrl: '/uploads/photos/santiago.webp'
    }));

    await TestBed.configureTestingModule({
      imports: [RegisterAthleteModalComponent],
      providers: [
        { provide: AthleteService, useValue: athleteServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterAthleteModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize and load clubs', () => {
    expect(component).toBeTruthy();
    expect(athleteServiceSpy.getClubs).toHaveBeenCalled();
    expect(component.clubs.length).toBe(1);
  });

  it('should allow selecting a photo and generating preview', () => {
    const validPhoto = new File(['fake image binary'], 'avatar.jpg', { type: 'image/jpeg' });
    component.handlePhotoFile(validPhoto);

    expect(component.selectedPhotoFile).toBe(validPhoto);
    expect(component.photoError).toBeNull();
  });

  it('should reject invalid photo format and files > 5MB', () => {
    // Archivo no imagen (txt)
    const invalidFile = new File(['text'], 'doc.txt', { type: 'text/plain' });
    component.handlePhotoFile(invalidFile);
    expect(component.photoError).toContain('Formato no permitido');
    expect(component.selectedPhotoFile).toBeNull();

    // Archivo mayor a 5MB
    const largeBytes = new Uint8Array(6 * 1024 * 1024);
    const hugeFile = new File([largeBytes], 'huge.png', { type: 'image/png' });
    component.handlePhotoFile(hugeFile);
    expect(component.photoError).toContain('supera los 5MB');
    expect(component.selectedPhotoFile).toBeNull();
  });

  it('should remove selected photo when calling removePhoto()', () => {
    const validPhoto = new File(['image bytes'], 'avatar.png', { type: 'image/png' });
    component.handlePhotoFile(validPhoto);
    expect(component.selectedPhotoFile).toBe(validPhoto);

    const dummyEvent = new MouseEvent('click');
    component.removePhoto(dummyEvent);

    expect(component.selectedPhotoFile).toBeNull();
    expect(component.photoPreviewUrl).toBeNull();
    expect(component.photoError).toBeNull();
  });

  it('should create athlete and chain uploadAthletePhoto when photo is selected', () => {
    spyOn(component.athleteCreated, 'emit');

    // Llenar formulario válido
    component.athleteForm.patchValue({
      firstName: 'Santiago',
      lastName: 'Rivas',
      birthDate: '2012-04-10',
      gender: 'MALE',
      primaryPosition: 'Delantero Centro',
      preferredFoot: 'DERECHO',
      nationality: 'Venezuela'
    });

    const photo = new File(['binary image data'], 'player.webp', { type: 'image/webp' });
    component.handlePhotoFile(photo);

    component.onSubmit();

    expect(athleteServiceSpy.createAthlete).toHaveBeenCalled();
    expect(athleteServiceSpy.uploadAthletePhoto).toHaveBeenCalledWith('ath-new', photo);
    expect(component.athleteCreated.emit).toHaveBeenCalledWith(jasmine.objectContaining({
      id: 'ath-new',
      profilePhotoUrl: '/uploads/photos/santiago.webp'
    }));
  });

  it('should create athlete without uploading photo if none was selected', () => {
    spyOn(component.athleteCreated, 'emit');

    component.athleteForm.patchValue({
      firstName: 'Santiago',
      lastName: 'Rivas',
      birthDate: '2012-04-10',
      gender: 'MALE',
      primaryPosition: 'Delantero Centro',
      preferredFoot: 'DERECHO',
      nationality: 'Venezuela'
    });

    component.onSubmit();

    expect(athleteServiceSpy.createAthlete).toHaveBeenCalled();
    expect(athleteServiceSpy.uploadAthletePhoto).not.toHaveBeenCalled();
    expect(component.athleteCreated.emit).toHaveBeenCalledWith(mockCreatedAthlete);
  });

  it('should display retry banner when uploadAthletePhoto fails during onSubmit()', () => {
    athleteServiceSpy.uploadAthletePhoto.and.returnValue(throwError(() => ({ error: { message: 'Error de conexión' } })));
    spyOn(component.athleteCreated, 'emit');

    component.athleteForm.patchValue({
      firstName: 'Santiago',
      lastName: 'Rivas',
      birthDate: '2012-04-10',
      gender: 'MALE',
      primaryPosition: 'Delantero Centro',
      preferredFoot: 'DERECHO',
      nationality: 'Venezuela'
    });

    const photo = new File(['binary image data'], 'player.webp', { type: 'image/webp' });
    component.handlePhotoFile(photo);

    component.onSubmit();

    expect(athleteServiceSpy.createAthlete).toHaveBeenCalled();
    expect(athleteServiceSpy.uploadAthletePhoto).toHaveBeenCalled();
    expect(component.photoUploadFailed).toBeTrue();
    expect(component.photoUploadErrorMessage).toContain('Error de conexión');
    expect(component.athleteCreated.emit).not.toHaveBeenCalled();
  });

  it('should allow retrying photo upload with retryPhotoUpload()', () => {
    spyOn(component.athleteCreated, 'emit');
    component.createdAthlete = mockCreatedAthlete;
    component.selectedPhotoFile = new File(['image'], 'player.webp', { type: 'image/webp' });
    component.photoUploadFailed = true;

    athleteServiceSpy.uploadAthletePhoto.and.returnValue(of({
      ...mockCreatedAthlete,
      profilePhotoUrl: '/uploads/photos/santiago.webp'
    }));

    component.retryPhotoUpload();

    expect(athleteServiceSpy.uploadAthletePhoto).toHaveBeenCalledWith('ath-new', component.selectedPhotoFile);
    expect(component.isRetryingPhoto).toBeFalse();
    expect(component.athleteCreated.emit).toHaveBeenCalledWith(jasmine.objectContaining({
      id: 'ath-new',
      profilePhotoUrl: '/uploads/photos/santiago.webp'
    }));
  });

  it('should allow continuing without photo with continueWithoutPhoto()', () => {
    spyOn(component.athleteCreated, 'emit');
    component.createdAthlete = mockCreatedAthlete;

    component.continueWithoutPhoto();

    expect(component.athleteCreated.emit).toHaveBeenCalledWith(mockCreatedAthlete);
  });

  it('should activate and require custom club location fields when OTHER is selected', () => {
    component.athleteForm.get('currentClubId')?.setValue('OTHER');

    expect(component.isOtherClubSelected).toBeTrue();
    expect(component.athleteForm.get('customClubName')?.validator).toBeTruthy();
    expect(component.athleteForm.get('customClubCity')?.validator).toBeTruthy();
    expect(component.athleteForm.get('customClubState')?.validator).toBeTruthy();
    expect(component.athleteForm.get('customClubCountry')?.validator).toBeTruthy();

    component.athleteForm.get('currentClubId')?.setValue('');
    expect(component.isOtherClubSelected).toBeFalse();
    expect(component.athleteForm.get('customClubName')?.validator).toBeNull();
    expect(component.athleteForm.get('customClubCity')?.validator).toBeNull();
  });

  it('should include custom club location fields when submitting with OTHER club', () => {
    spyOn(component.athleteCreated, 'emit');

    component.athleteForm.patchValue({
      firstName: 'Mateo',
      lastName: 'Valero',
      birthDate: '2012-06-15',
      gender: 'MALE',
      primaryPosition: 'Delantero Centro',
      preferredFoot: 'DERECHO',
      nationality: 'Venezuela',
      currentClubId: 'OTHER',
      customClubName: 'Academia Carabobo FC',
      customClubCity: 'Valencia',
      customClubState: 'Carabobo',
      customClubCountry: 'Venezuela'
    });

    component.onSubmit();

    expect(athleteServiceSpy.createAthlete).toHaveBeenCalledWith(jasmine.objectContaining({
      firstName: 'Mateo',
      lastName: 'Valero',
      currentClubId: undefined,
      customClubName: 'Academia Carabobo FC',
      customClubCity: 'Valencia',
      customClubState: 'Carabobo',
      customClubCountry: 'Venezuela'
    }));
  });
});

