import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { AthleteService } from '../../../core/services/athlete.service';
import { ClubDto } from '../../../core/models/athlete.model';
import { BrandLogoComponent } from '../../../shared/components/brand-logo/brand-logo.component';

@Component({
  selector: 'app-register-scout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, BrandLogoComponent],
  templateUrl: './register-scout.component.html',
  styleUrl: './register-scout.component.css'
})
export class RegisterScoutComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private athleteService = inject(AthleteService);
  private router = inject(Router);

  registerForm: FormGroup;
  selectedFile: File | null = null;
  fileError: string | null = null;
  isDragging = false;
  isLoading = false;
  isLoadingClubs = false;
  clubs: ClubDto[] = [];
  errorMessage: string | null = null;
  conflictEmail: string | null = null;
  showCustomRoleInput = false;

  readonly scoutRoles = [
    'Reclutador Oficial',
    'Director Deportivo',
    'Agente FIFA',
    'Entrenador Principal',
    'Analista de Rendimiento',
    'Otro'
  ];

  readonly authorizedCountries = [
    'Venezuela',
    'Colombia',
    'Chile',
    'Perú',
    'Ecuador',
    'Bolivia'
  ];

  constructor() {
    this.registerForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.maxLength(150)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(100)]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^\+[1-9]\d{7,14}$/)]],
      organizationSelect: ['', [Validators.required]],
      organizationName: ['', [Validators.maxLength(150)]],
      organizationClubId: [''],
      customClubName: ['', [Validators.maxLength(150)]],
      customClubCity: ['', [Validators.maxLength(100)]],
      customClubState: ['', [Validators.maxLength(100)]],
      customClubCountry: ['Venezuela', [Validators.maxLength(100)]],
      scoutRole: ['', [Validators.required, Validators.maxLength(100)]],
      customScoutRole: ['', [Validators.maxLength(100)]],
      linkedinUrl: ['', [Validators.maxLength(255)]],
      acceptLegalNotice: [false, [Validators.requiredTrue]]
    });
  }

  get isOtherOrganizationSelected(): boolean {
    return this.registerForm.get('organizationSelect')?.value === 'OTHER';
  }

  get isIndependentSelected(): boolean {
    return this.registerForm.get('organizationSelect')?.value === 'INDEPENDENT';
  }

  get verifiedClubs(): ClubDto[] {
    return this.clubs.filter(c => c.verifiedOfficial !== false);
  }

  ngOnInit(): void {
    this.loadClubs();
    this.setupOrganizationListener();
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

  private setupOrganizationListener(): void {
    this.registerForm.get('organizationSelect')?.valueChanges.subscribe((val) => {
      const customName = this.registerForm.get('customClubName');
      const customCity = this.registerForm.get('customClubCity');
      const customState = this.registerForm.get('customClubState');
      const customCountry = this.registerForm.get('customClubCountry');

      if (val === 'OTHER') {
        customName?.setValidators([Validators.required, Validators.maxLength(150)]);
        customCity?.setValidators([Validators.required, Validators.maxLength(100)]);
        customState?.setValidators([Validators.required, Validators.maxLength(100)]);
        customCountry?.setValidators([Validators.required, Validators.maxLength(100)]);
        this.registerForm.patchValue({
          organizationClubId: '',
          organizationName: customName?.value || ''
        });
      } else if (val === 'INDEPENDENT') {
        customName?.clearValidators();
        customCity?.clearValidators();
        customState?.clearValidators();
        customCountry?.clearValidators();
        customName?.setValue('');
        customCity?.setValue('');
        customState?.setValue('');
        customCountry?.setValue('Venezuela');
        this.registerForm.patchValue({
          organizationClubId: '',
          organizationName: 'Agente Independiente'
        });
      } else if (val) {
        const selectedClub = this.clubs.find(c => c.id === val);
        customName?.clearValidators();
        customCity?.clearValidators();
        customState?.clearValidators();
        customCountry?.clearValidators();
        customName?.setValue('');
        customCity?.setValue('');
        customState?.setValue('');
        customCountry?.setValue('Venezuela');
        this.registerForm.patchValue({
          organizationClubId: val,
          organizationName: selectedClub ? selectedClub.name : ''
        });
      }

      customName?.updateValueAndValidity();
      customCity?.updateValueAndValidity();
      customState?.updateValueAndValidity();
      customCountry?.updateValueAndValidity();
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.registerForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  onRoleChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    if (select.value === 'Otro') {
      this.showCustomRoleInput = true;
      this.registerForm.get('customScoutRole')?.setValidators([Validators.required, Validators.maxLength(100)]);
    } else {
      this.showCustomRoleInput = false;
      this.registerForm.get('customScoutRole')?.clearValidators();
      this.registerForm.get('customScoutRole')?.setValue('');
    }
    this.registerForm.get('customScoutRole')?.updateValueAndValidity();
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.validateAndSetFile(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.validateAndSetFile(input.files[0]);
    }
  }

  private validateAndSetFile(file: File): void {
    this.fileError = null;
    const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg'];
    const fileName = file.name.toLowerCase();
    const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

    if (!hasValidExtension) {
      this.fileError = 'Formato no soportado. Debe ser un archivo PDF, PNG o JPG.';
      this.selectedFile = null;
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      this.fileError = 'El archivo supera el tamaño máximo permitido de 10 MB.';
      this.selectedFile = null;
      return;
    }

    this.selectedFile = file;
  }

  removeFile(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.selectedFile = null;
    this.fileError = null;
  }

  onSubmit(): void {
    if (this.registerForm.invalid || !this.selectedFile) {
      this.registerForm.markAllAsTouched();
      if (!this.selectedFile) {
        this.fileError = 'Es obligatorio consignar un documento probatorio o credencial deportiva.';
      }
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.conflictEmail = null;

    const roleValue = this.showCustomRoleInput
      ? this.registerForm.get('customScoutRole')?.value?.trim()
      : this.registerForm.get('scoutRole')?.value;

    const orgSelectValue = this.registerForm.get('organizationSelect')?.value;
    const isOther = orgSelectValue === 'OTHER';
    const isIndep = orgSelectValue === 'INDEPENDENT';

    let orgNameValue = this.registerForm.get('organizationName')?.value?.trim();
    let orgClubIdValue = this.registerForm.get('organizationClubId')?.value;

    if (isOther) {
      orgNameValue = this.registerForm.get('customClubName')?.value?.trim();
      orgClubIdValue = null;
    } else if (isIndep) {
      orgNameValue = 'Agente Independiente';
      orgClubIdValue = null;
    } else if (orgSelectValue && orgSelectValue !== '') {
      orgClubIdValue = orgSelectValue;
      const club = this.clubs.find(c => c.id === orgSelectValue);
      if (club) {
        orgNameValue = club.name;
      }
    }

    const formData = new FormData();
    formData.append('fullName', this.registerForm.get('fullName')?.value?.trim());
    formData.append('email', this.registerForm.get('email')?.value?.trim());
    formData.append('password', this.registerForm.get('password')?.value);
    formData.append('phoneNumber', this.registerForm.get('phoneNumber')?.value?.trim());

    if (orgNameValue) {
      formData.append('organizationName', orgNameValue);
    }
    if (orgClubIdValue) {
      formData.append('organizationClubId', orgClubIdValue);
    }
    if (isOther) {
      const city = this.registerForm.get('customClubCity')?.value?.trim();
      const state = this.registerForm.get('customClubState')?.value?.trim();
      const country = this.registerForm.get('customClubCountry')?.value?.trim();
      if (city) formData.append('customClubCity', city);
      if (state) formData.append('customClubState', state);
      if (country) formData.append('customClubCountry', country);
    }

    formData.append('scoutRole', roleValue);

    const linkedin = this.registerForm.get('linkedinUrl')?.value;
    if (linkedin && linkedin.trim()) {
      formData.append('linkedinUrl', linkedin.trim());
    }

    formData.append('credentialsFile', this.selectedFile);

    const email = this.registerForm.get('email')?.value?.trim();
    const finalDisplayOrg = orgNameValue || 'Agente Independiente';

    this.authService.registerScout(formData).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/auth/scout-pending-audit'], {
          queryParams: {
            email,
            org: finalDisplayOrg
          }
        });
      },
      error: (err) => {
        this.isLoading = false;
        if (err.status === 409) {
          this.conflictEmail = email;
          this.errorMessage = 'Ya existe un usuario registrado con este correo electrónico.';
        } else if (err.status === 400) {
          this.errorMessage = err.error?.message || 'Los datos suministrados no son válidos. Por favor revisa los campos señalados.';
        } else {
          this.errorMessage = err.error?.message || 'Ocurrió un error al procesar tu postulación. Por favor intenta nuevamente.';
        }
      }
    });
  }
}
