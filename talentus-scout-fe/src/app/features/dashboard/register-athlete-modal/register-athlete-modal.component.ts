import { Component, EventEmitter, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AthleteService } from '../../../core/services/athlete.service';
import { AthleteSummary, ClubDto, CreateAthleteRequest } from '../../../core/models/athlete.model';

@Component({
  selector: 'app-register-athlete-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register-athlete-modal.component.html',
  styles: [`
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(5px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 16px;
      overflow-y: auto;
    }

    .modal-card {
      background: var(--color-surface, #0f172a);
      border: 1px solid var(--color-border, #1e293b);
      border-radius: var(--radius-md, 16px);
      width: 100%;
      max-width: 680px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
      animation: modalSlide 0.2s ease-out;
    }

    @keyframes modalSlide {
      from {
        opacity: 0;
        transform: translateY(12px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .modal-header {
      padding: 20px 24px;
      border-bottom: 1px solid #1e293b;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-shrink: 0;
    }

    .badge-modal {
      display: inline-block;
      font-size: 10.5px;
      font-weight: 700;
      color: #10b981;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 3px 8px;
      border-radius: 9999px;
      letter-spacing: 0.05em;
      margin-bottom: 6px;
    }

    .modal-title {
      font-size: 20px;
      font-weight: 700;
      color: #f8fafc;
      margin: 0 0 4px 0;
    }

    .modal-subtitle {
      font-size: 13px;
      color: #94a3b8;
      margin: 0;
    }

    .btn-close {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 22px;
      cursor: pointer;
      line-height: 1;
      padding: 4px;
      border-radius: 6px;
      transition: color 0.15s ease;
    }

    .btn-close:hover {
      color: #f8fafc;
      background: rgba(255, 255, 255, 0.05);
    }

    .modal-body {
      padding: 24px;
      overflow-y: auto;
      flex: 1;
    }

    .section-title {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #38bdf8;
      margin: 20px 0 12px 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .section-title:first-child {
      margin-top: 0;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }

    .col-span-2 {
      grid-column: span 2;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-label {
      font-size: 12.5px;
      font-weight: 600;
      color: #e2e8f0;
      display: flex;
      justify-content: space-between;
    }

    .form-control {
      background: #020617;
      border: 1px solid #334155;
      border-radius: 8px;
      color: #f8fafc;
      padding: 9px 12px;
      font-size: 13px;
      font-family: inherit;
      transition: border-color 0.15s ease;
    }

    .form-control:focus {
      outline: none;
      border-color: #10b981;
      box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
    }

    .form-control.is-invalid {
      border-color: #ef4444;
    }

    .form-error {
      font-size: 11.5px;
      color: #f87171;
    }

    .legal-notice {
      background: rgba(14, 165, 233, 0.08);
      border: 1px solid rgba(14, 165, 233, 0.25);
      border-radius: 8px;
      padding: 12px 14px;
      margin-top: 18px;
      font-size: 12.5px;
      color: #bae6fd;
      line-height: 1.45;
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }

    .federation-info-callout {
      background: rgba(14, 165, 233, 0.06);
      border: 1px solid rgba(14, 165, 233, 0.22);
      border-radius: 8px;
      padding: 12px 14px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .callout-icon {
      font-size: 15px;
      line-height: 1.2;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .callout-content {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .callout-title {
      font-size: 12.5px;
      font-weight: 600;
      color: #e0f2fe;
      margin: 0;
    }

    .callout-description {
      font-size: 11.5px;
      color: #94a3b8;
      line-height: 1.45;
      margin: 0;
    }

    .callout-description strong {
      color: #38bdf8;
      font-weight: 600;
    }

    .custom-club-group {
      animation: customClubFadeIn 0.2s ease-out;
    }

    @keyframes customClubFadeIn {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .modal-footer {
      padding: 18px 24px;
      border-top: 1px solid #1e293b;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      flex-shrink: 0;
      background: rgba(2, 6, 23, 0.4);
    }

    .btn {
      padding: 9px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-secondary {
      background: transparent;
      border: 1px solid #334155;
      color: #cbd5e1;
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.05);
      color: #fff;
    }

    .btn-primary {
      background: #10b981;
      border: 1px solid #10b981;
      color: #020617;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .btn-primary:hover:not(:disabled) {
      background: #059669;
      border-color: #059669;
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .photo-upload-section {
      background: #0B1120;
      border: 1px solid #1E293B;
      border-radius: 12px;
      padding: 16px;
    }

    .photo-picker-container {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-top: 8px;
    }

    .photo-preview-box {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      border: 2px solid #10B981;
      overflow: hidden;
      background: #1E293B;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .photo-preview-thumb {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .photo-placeholder-thumb {
      font-size: 24px;
    }

    .photo-picker-actions {
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex: 1;
    }

    .photo-picker-hint {
      font-size: 11.5px;
      color: #94A3B8;
    }

    .photo-selected-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .photo-file-name {
      font-size: 13px;
      color: #F8FAFC;
      font-weight: 500;
    }

    .btn-remove-photo {
      background: transparent;
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #F87171;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
    }

    .btn-remove-photo:hover {
      background: rgba(239, 68, 68, 0.15);
      border-color: #EF4444;
    }

    .photo-lopnna-hint {
      margin-top: 10px;
      font-size: 11px;
      color: #94A3B8;
      display: flex;
      gap: 6px;
      align-items: flex-start;
      line-height: 1.4;
    }

    .photo-retry-banner {
      background: rgba(245, 158, 11, 0.08);
      border: 1px solid rgba(245, 158, 11, 0.35);
      border-radius: 12px;
      padding: 16px;
      margin-top: 16px;
      display: flex;
      gap: 14px;
      align-items: flex-start;
      animation: modalSlide 0.2s ease-out;
    }

    .retry-icon {
      font-size: 22px;
      flex-shrink: 0;
      line-height: 1;
    }

    .retry-content {
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: 1;
    }

    .retry-title {
      font-size: 14px;
      font-weight: 700;
      color: #FBBF24;
      margin: 0;
    }

    .retry-desc {
      font-size: 12.5px;
      color: #E2E8F0;
      margin: 0;
      line-height: 1.45;
    }

    .retry-actions {
      display: flex;
      gap: 10px;
      margin-top: 6px;
      flex-wrap: wrap;
    }

    .btn-sm {
      padding: 6px 14px;
      font-size: 12px;
    }

    @media (max-width: 600px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
      .col-span-2 {
        grid-column: span 1;
      }
    }
  `]
})
export class RegisterAthleteModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private athleteService = inject(AthleteService);

  @Output() athleteCreated = new EventEmitter<AthleteSummary>();
  @Output() closed = new EventEmitter<void>();

  isLoadingClubs = false;
  isSubmitting = false;
  errorMessage: string | null = null;
  ageError: string | null = null;
  clubs: ClubDto[] = [];
  selectedPhotoFile: File | null = null;
  photoPreviewUrl: string | null = null;
  photoError: string | null = null;
  isDraggingPhoto = false;

  createdAthlete: AthleteSummary | null = null;
  photoUploadFailed = false;
  photoUploadErrorMessage: string | null = null;
  isRetryingPhoto = false;

  readonly positions = [
    'Portero',
    'Defensa Central',
    'Lateral Derecho',
    'Lateral Izquierdo',
    'Mediocampista Defensivo',
    'Mediocampista Central',
    'Mediocampista Ofensivo',
    'Extremo Derecho',
    'Extremo Izquierdo',
    'Delantero Centro'
  ];

  readonly preferredFeet = [
    { value: 'DERECHO', label: 'Diestro (Derecho)' },
    { value: 'IZQUIERDO', label: 'Zurdo (Izquierdo)' },
    { value: 'AMBIDIESTRO', label: 'Ambidiestro' }
  ];

  readonly authorizedCountries = [
    'Venezuela',
    'Colombia',
    'Chile',
    'Perú',
    'Ecuador',
    'Bolivia'
  ];

  athleteForm: FormGroup = this.fb.group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    birthDate: ['', [Validators.required]],
    gender: ['MALE', [Validators.required]],
    primaryPosition: ['Delantero Centro', [Validators.required]],
    secondaryPosition: [''],
    preferredFoot: ['DERECHO', [Validators.required]],
    nationality: ['Venezuela', [Validators.required]],
    secondaryPassports: [''],
    currentClubId: [''],
    customClubName: [''],
    customClubCity: [''],
    customClubState: [''],
    customClubCountry: ['Venezuela'],
    heightCm: [null, [Validators.min(90), Validators.max(230)]],
    weightKg: [null, [Validators.min(20), Validators.max(150)]],
    bio: [''],
    isPublic: [true]
  });

  get isOtherClubSelected(): boolean {
    return this.athleteForm.get('currentClubId')?.value === 'OTHER';
  }

  ngOnInit(): void {
    this.loadClubs();
    this.setupClubSelectionListener();
  }

  private setupClubSelectionListener(): void {
    this.athleteForm.get('currentClubId')?.valueChanges.subscribe((val) => {
      const customName = this.athleteForm.get('customClubName');
      const customCity = this.athleteForm.get('customClubCity');
      const customState = this.athleteForm.get('customClubState');
      const customCountry = this.athleteForm.get('customClubCountry');

      if (val === 'OTHER') {
        customName?.setValidators([Validators.required, Validators.maxLength(150)]);
        customCity?.setValidators([Validators.required, Validators.maxLength(100)]);
        customState?.setValidators([Validators.required, Validators.maxLength(100)]);
        customCountry?.setValidators([Validators.required, Validators.maxLength(100)]);
      } else {
        customName?.clearValidators();
        customCity?.clearValidators();
        customState?.clearValidators();
        customCountry?.clearValidators();
        customName?.setValue('');
        customCity?.setValue('');
        customState?.setValue('');
        customCountry?.setValue('Venezuela');
      }
      customName?.updateValueAndValidity();
      customCity?.updateValueAndValidity();
      customState?.updateValueAndValidity();
      customCountry?.updateValueAndValidity();
    });
  }

  loadClubs(): void {
    this.isLoadingClubs = true;
    this.athleteService.getClubs().subscribe({
      next: (clubs) => {
        this.clubs = clubs || [];
        this.isLoadingClubs = false;
      },
      error: () => {
        this.isLoadingClubs = false;
      }
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.athleteForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  onBirthDateChange(): void {
    const val = this.athleteForm.get('birthDate')?.value;
    if (!val) {
      this.ageError = null;
      return;
    }
    const birth = new Date(val);
    const today = new Date();
    if (birth > today) {
      this.ageError = 'La fecha de nacimiento no puede ser futura.';
      return;
    }
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    if (age >= 21) {
      this.ageError = `El atleta tiene ${age} años. La plataforma está reservada para categorías formativas juveniles (< 21 años).`;
    } else {
      this.ageError = null;
    }
  }

  onPhotoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handlePhotoFile(input.files[0]);
    }
  }

  onPhotoDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingPhoto = true;
  }

  onPhotoDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingPhoto = false;
  }

  onPhotoDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingPhoto = false;

    if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      this.handlePhotoFile(file);
    }
  }

  handlePhotoFile(file: File): void {
    const maxBytes = 5 * 1024 * 1024;
    const allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowedExtensions.includes(fileExt)) {
      this.photoError = 'Formato no permitido. Solo se aceptan imágenes PNG, JPG, JPEG o WEBP.';
      this.selectedPhotoFile = null;
      return;
    }

    if (file.size > maxBytes) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      this.photoError = `El archivo supera los 5MB permitidos (${sizeMb} MB). Por favor selecciona una imagen más liviana.`;
      this.selectedPhotoFile = null;
      return;
    }

    this.photoError = null;
    this.selectedPhotoFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.photoPreviewUrl = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  removePhoto(event: Event, input?: HTMLInputElement): void {
    event.stopPropagation();
    this.selectedPhotoFile = null;
    this.photoPreviewUrl = null;
    this.photoError = null;
    if (input) {
      input.value = '';
    }
  }

  onSubmit(): void {
    if (this.athleteForm.invalid) {
      this.athleteForm.markAllAsTouched();
      return;
    }

    this.onBirthDateChange();
    if (this.ageError) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;

    const raw = this.athleteForm.value;
    const isOther = raw.currentClubId === 'OTHER';
    const request: CreateAthleteRequest = {
      firstName: raw.firstName.trim(),
      lastName: raw.lastName.trim(),
      birthDate: raw.birthDate,
      gender: raw.gender,
      primaryPosition: raw.primaryPosition,
      secondaryPosition: raw.secondaryPosition ? raw.secondaryPosition.trim() : undefined,
      preferredFoot: raw.preferredFoot,
      nationality: raw.nationality ? raw.nationality.trim() : 'Venezolana',
      secondaryPassports: raw.secondaryPassports ? raw.secondaryPassports.trim() : undefined,
      currentClubId: isOther ? undefined : (raw.currentClubId ? raw.currentClubId : undefined),
      customClubName: isOther && raw.customClubName ? raw.customClubName.trim() : undefined,
      customClubCity: isOther && raw.customClubCity ? raw.customClubCity.trim() : undefined,
      customClubState: isOther && raw.customClubState ? raw.customClubState.trim() : undefined,
      customClubCountry: isOther && raw.customClubCountry ? raw.customClubCountry.trim() : undefined,
      heightCm: raw.heightCm ? Number(raw.heightCm) : undefined,
      weightKg: raw.weightKg ? Number(raw.weightKg) : undefined,
      bio: raw.bio ? raw.bio.trim() : undefined,
      isPublic: raw.isPublic !== false
    };

    this.athleteService.createAthlete(request).subscribe({
      next: (created) => {
        this.createdAthlete = created;
        if (this.selectedPhotoFile) {
          this.athleteService.uploadAthletePhoto(created.id, this.selectedPhotoFile).subscribe({
            next: (withPhoto) => {
              this.isSubmitting = false;
              this.athleteCreated.emit(withPhoto);
            },
            error: (photoErr) => {
              this.isSubmitting = false;
              this.photoUploadFailed = true;
              this.photoUploadErrorMessage = photoErr.error?.message ||
                'La cédula deportiva fue creada con éxito, pero ocurrió un problema al cargar la fotografía en el servidor. Puedes reintentar la subida ahora o gestionarla desde tu dashboard.';
            }
          });
        } else {
          this.isSubmitting = false;
          this.athleteCreated.emit(created);
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err.error?.message || 'Error al registrar al atleta en el servidor. Revisa los datos ingresados.';
      }
    });
  }

  retryPhotoUpload(): void {
    if (!this.createdAthlete || !this.selectedPhotoFile) {
      return;
    }
    this.isRetryingPhoto = true;
    this.photoUploadErrorMessage = null;
    this.athleteService.uploadAthletePhoto(this.createdAthlete.id, this.selectedPhotoFile).subscribe({
      next: (withPhoto) => {
        this.isRetryingPhoto = false;
        this.athleteCreated.emit(withPhoto);
      },
      error: (err) => {
        this.isRetryingPhoto = false;
        this.photoUploadFailed = true;
        this.photoUploadErrorMessage = err.error?.message ||
          'El reintento de subida falló. Puedes continuar al panel y cargar la fotografía en cualquier momento.';
      }
    });
  }

  continueWithoutPhoto(): void {
    if (this.createdAthlete) {
      this.athleteCreated.emit(this.createdAthlete);
    } else {
      this.closeModal();
    }
  }

  closeModal(): void {
    this.closed.emit();
  }
}
