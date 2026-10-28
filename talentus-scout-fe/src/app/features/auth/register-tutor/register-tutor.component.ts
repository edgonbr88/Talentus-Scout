import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { SocialAuthManagerService } from '../../../core/auth/social-auth-manager.service';
import { OauthConfigModalComponent } from '../../../shared/components/oauth-config-modal/oauth-config-modal.component';
import { BrandLogoComponent } from '../../../shared/components/brand-logo/brand-logo.component';

@Component({
  selector: 'app-register-tutor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, OauthConfigModalComponent, BrandLogoComponent],
  templateUrl: './register-tutor.component.html',
  styles: [`
    .auth-wrapper {
      min-height: calc(100vh - 180px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
    }

    .register-card {
      width: 100%;
      max-width: 580px;
      background-color: var(--color-surface, #0f172a);
      border: 1px solid var(--color-border, #1e293b);
      border-radius: var(--radius-md, 16px);
      padding: 36px 32px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
    }

    .auth-header {
      margin-bottom: 24px;
    }

    .badge-legal {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      color: #38bdf8;
      background: rgba(14, 165, 233, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.3);
      padding: 4px 10px;
      border-radius: 9999px;
      margin-bottom: 8px;
      letter-spacing: 0.05em;
    }

    .auth-title {
      font-size: 24px;
      color: #f8fafc;
      margin: 10px 0 6px;
      font-weight: 800;
    }

    .auth-subtitle {
      color: #94a3b8;
      font-size: 14px;
      line-height: 1.5;
      margin: 0;
    }

    .social-auth-section {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin: 20px 0;
    }

    .btn-social {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      width: 100%;
      padding: 11px 16px;
      background-color: #1e293b;
      border: 1px solid #334155;
      border-radius: 10px;
      color: #e2e8f0;
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-social:hover:not(:disabled) {
      background-color: #334155;
      border-color: #475569;
    }

    .auth-divider {
      display: flex;
      align-items: center;
      text-align: center;
      margin: 24px 0;
      color: #64748b;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .auth-divider::before,
    .auth-divider::after {
      content: '';
      flex: 1;
      border-bottom: 1px solid #1e293b;
    }

    .auth-divider span {
      padding: 0 12px;
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-label {
      font-size: 13px;
      font-weight: 600;
      color: #cbd5e1;
    }

    .form-control {
      padding: 11px 14px;
      background-color: #0b1120;
      border: 1px solid #334155;
      border-radius: 8px;
      color: #f8fafc;
      font-size: 14px;
      transition: border-color 0.2s;
    }

    .select-control {
      appearance: auto;
      cursor: pointer;
    }

    .form-control:focus {
      outline: none;
      border-color: #10b981;
    }

    .form-control.is-invalid {
      border-color: #ef4444;
    }

    .form-hint {
      font-size: 11px;
      color: #64748b;
    }

    .form-error {
      font-size: 12px;
      color: #f87171;
    }

    .document-section {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .section-badge {
      font-size: 11px;
      font-weight: 700;
      color: #10b981;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .form-row-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    @media (max-width: 520px) {
      .form-row-2 {
        grid-template-columns: 1fr;
      }
    }

    .file-dropzone {
      border: 2px dashed #334155;
      border-radius: 10px;
      padding: 18px;
      text-align: center;
      cursor: pointer;
      background: #0b1120;
      transition: all 0.2s ease;
    }

    .file-dropzone:hover {
      border-color: #10b981;
      background: rgba(16, 185, 129, 0.05);
    }

    .file-dropzone.has-file {
      border-style: solid;
      border-color: #10b981;
      background: rgba(16, 185, 129, 0.08);
    }

    .dropzone-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }

    .upload-icon {
      width: 26px;
      height: 26px;
      color: #64748b;
    }

    .dropzone-text {
      font-size: 13px;
      font-weight: 600;
      color: #38bdf8;
    }

    .dropzone-hint {
      font-size: 11px;
      color: #64748b;
    }

    .dropzone-file {
      display: flex;
      align-items: center;
      gap: 12px;
      text-align: left;
    }

    .file-icon {
      width: 28px;
      height: 28px;
      color: #10b981;
      flex-shrink: 0;
    }

    .file-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .file-name {
      font-size: 13px;
      font-weight: 600;
      color: #f8fafc;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .file-size {
      font-size: 11px;
      color: #94A3B8;
    }

    .btn-remove-file {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 16px;
      cursor: pointer;
      padding: 4px;
    }

    .btn-remove-file:hover {
      color: #ef4444;
    }

    .legal-consent-card {
      background-color: #0b1120;
      border: 1px solid #1e293b;
      border-radius: 10px;
      padding: 16px;
      margin-top: 4px;
    }

    .legal-consent-card.consent-error {
      border-color: #ef4444;
    }

    .consent-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .consent-title {
      font-size: 12.5px;
      font-weight: 700;
      color: #f8fafc;
    }

    .consent-text {
      font-size: 11.5px;
      color: #94a3b8;
      line-height: 1.5;
      margin: 0 0 12px;
    }

    .consent-checkbox-label {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      cursor: pointer;
    }

    .consent-checkbox {
      margin-top: 3px;
      accent-color: #10b981;
      width: 16px;
      height: 16px;
    }

    .checkbox-text {
      font-size: 12px;
      color: #cbd5e1;
      line-height: 1.45;
    }

    .btn-block {
      width: 100%;
      padding: 13px 20px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 14.5px;
      cursor: pointer;
      background: #10b981;
      color: #ffffff;
      border: none;
      transition: all 0.2s;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
    }

    .btn-block:hover:not(:disabled) {
      background: #059669;
      transform: translateY(-1px);
    }

    .btn-block:disabled {
      background: #334155;
      color: #94a3b8;
      box-shadow: none;
      cursor: not-allowed;
      transform: none;
    }

    .auth-footer {
      margin-top: 24px;
      text-align: center;
      font-size: 13px;
      color: #94a3b8;
    }

    .link-login {
      color: #10b981;
      font-weight: 600;
      text-decoration: none;
    }

    .link-login:hover {
      text-decoration: underline;
    }
  `]
})
export class RegisterTutorComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private socialAuthManager = inject(SocialAuthManagerService);
  private router = inject(Router);

  isLoading = false;
  errorMessage: string | null = null;
  selectedFile: File | null = null;
  fileError: string | null = null;

  showConfigModal = false;
  configModalProvider: 'google' | 'microsoft' | 'all' = 'all';

  readonly authorizedCountries: string[] = [
    'Venezuela',
    'Colombia',
    'Chile',
    'Perú',
    'Ecuador',
    'Bolivia'
  ];

  registerForm: FormGroup = this.fb.group({
    fullName: ['', [Validators.required, Validators.maxLength(150)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    phoneNumber: ['', [Validators.required, Validators.pattern(/^\+[1-9]\d{7,14}$/)]],
    country: ['Venezuela', [Validators.required]],
    state: ['', [Validators.required, Validators.maxLength(100)]],
    address: ['', [Validators.maxLength(255)]],
    idDocumentType: ['CEDULA', [Validators.required]],
    idDocumentNumber: ['', [Validators.required, Validators.maxLength(50)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(100)]],
    acceptLopnnaTerms: [false, [Validators.requiredTrue]]
  });

  isFieldInvalid(fieldName: string): boolean {
    const field = this.registerForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const maxBytes = 5 * 1024 * 1024; // 5MB
      const allowedExts = ['jpg', 'jpeg', 'png', 'pdf'];
      const fileExt = file.name.split('.').pop()?.toLowerCase();

      if (!fileExt || !allowedExts.includes(fileExt)) {
        this.fileError = 'Solo se permiten archivos en formato JPG, PNG o PDF.';
        this.selectedFile = null;
        return;
      }

      if (file.size > maxBytes) {
        this.fileError = 'El archivo no puede exceder los 5 MB.';
        this.selectedFile = null;
        return;
      }

      this.fileError = null;
      this.selectedFile = file;
    }
  }

  removeFile(event: Event): void {
    event.stopPropagation();
    this.selectedFile = null;
    this.fileError = null;
  }

  registerWithGoogle(): void {
    if (!this.socialAuthManager.hasGoogleClientId()) {
      this.openConfigModal('google');
      return;
    }
    this.startOAuthFlow('google');
  }

  registerWithMicrosoft(): void {
    if (!this.socialAuthManager.hasMicrosoftClientId()) {
      this.openConfigModal('microsoft');
      return;
    }
    this.startOAuthFlow('microsoft');
  }

  openConfigModal(provider: 'google' | 'microsoft' | 'all'): void {
    this.configModalProvider = provider;
    this.showConfigModal = true;
  }

  closeConfigModal(): void {
    this.showConfigModal = false;
  }

  onConfigSaved(provider: 'google' | 'microsoft' | 'all'): void {
    this.showConfigModal = false;
    if (provider === 'google' && this.socialAuthManager.hasGoogleClientId()) {
      this.startOAuthFlow('google');
    } else if (provider === 'microsoft' && this.socialAuthManager.hasMicrosoftClientId()) {
      this.startOAuthFlow('microsoft');
    }
  }

  private startOAuthFlow(provider: 'google' | 'microsoft'): void {
    this.isLoading = true;
    this.errorMessage = null;

    const authPromise = provider === 'google'
      ? this.socialAuthManager.loginWithGoogle()
      : this.socialAuthManager.loginWithMicrosoft();

    authPromise
      .then((token) => {
        const obs = provider === 'google'
          ? this.authService.socialLoginGoogle(token)
          : this.authService.socialLoginMicrosoft(token);

        obs.subscribe({
          next: (res) => {
            this.isLoading = false;
            if (res.needsProfileCompletion) {
              this.router.navigate(['/auth/complete-profile']);
            } else {
              this.router.navigate(['/dashboard']);
            }
          },
          error: (err) => {
            this.isLoading = false;
            this.errorMessage = err.error?.message || `Error al procesar el registro con ${provider === 'google' ? 'Google' : 'Microsoft'} en el servidor.`;
          }
        });
      })
      .catch((err) => {
        this.isLoading = false;
        if (err.message === 'NO_CLIENT_ID_GOOGLE') {
          this.openConfigModal('google');
        } else if (err.message === 'NO_CLIENT_ID_MICROSOFT') {
          this.openConfigModal('microsoft');
        } else {
          this.errorMessage = err.message || 'Error durante la autenticación social.';
        }
      });
  }

  onSubmit(): void {
    if (this.registerForm.invalid || !this.selectedFile) {
      this.registerForm.markAllAsTouched();
      if (!this.selectedFile) {
        this.fileError = 'Es obligatorio adjuntar el archivo físico de tu documento de identidad.';
      }
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    const formData = new FormData();
    formData.append('fullName', this.registerForm.get('fullName')?.value);
    formData.append('email', this.registerForm.get('email')?.value);
    formData.append('password', this.registerForm.get('password')?.value);
    formData.append('phoneNumber', this.registerForm.get('phoneNumber')?.value);
    formData.append('country', this.registerForm.get('country')?.value);
    formData.append('state', this.registerForm.get('state')?.value);
    const addressVal = this.registerForm.get('address')?.value;
    if (addressVal && addressVal.trim()) {
      formData.append('address', addressVal.trim());
    }
    formData.append('acceptLopnnaTerms', String(this.registerForm.get('acceptLopnnaTerms')?.value));
    formData.append('idDocumentType', this.registerForm.get('idDocumentType')?.value);
    formData.append('idDocumentNumber', this.registerForm.get('idDocumentNumber')?.value);
    formData.append('idDocumentFile', this.selectedFile);

    const email = this.registerForm.get('email')?.value;

    this.authService.registerTutor(formData).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/auth/verify-email-pending'], {
          queryParams: { email }
        });
      },
      error: (err) => {
        this.isLoading = false;
        if (err.status === 409) {
          this.errorMessage = 'Ya existe un usuario registrado con este correo electrónico.';
        } else {
          this.errorMessage = err.error?.message || 'Ocurrió un error al procesar el registro. Intenta de nuevo.';
        }
      }
    });
  }
}
