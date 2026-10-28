import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { UserRole } from '../../../core/models/user.model';
import { CompleteProfileRequest } from '../../../core/models/auth.model';
import { BrandLogoComponent } from '../../../shared/components/brand-logo/brand-logo.component';

@Component({
  selector: 'app-complete-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BrandLogoComponent],
  templateUrl: './complete-profile.component.html',
  styles: [`
    .auth-wrapper {
      min-height: calc(100vh - 160px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
    }

    .complete-profile-card {
      width: 100%;
      max-width: 580px;
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 36px 32px;
      box-shadow: 0 12px 35px rgba(0, 0, 0, 0.4);
    }

    .auth-header {
      margin-bottom: 24px;
      text-align: left;
    }

    .badge-activation {
      background-color: rgba(16, 185, 129, 0.15);
      color: var(--color-accent-pitch);
      border: 1px solid rgba(16, 185, 129, 0.35);
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 700;
      border-radius: var(--radius-full);
      letter-spacing: 0.05em;
      display: inline-block;
      margin-bottom: 8px;
    }

    .auth-title {
      font-size: 24px;
      margin: 4px 0 6px;
    }

    .auth-subtitle {
      font-size: 14px;
      color: var(--color-text-muted);
      line-height: 1.5;
    }

    /* Role Selection Grid */
    .role-grid {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 8px;
    }

    .role-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 16px;
      background: var(--color-surface-elevated);
      border: 1.5px solid var(--color-border);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .role-card:hover {
      background: var(--color-surface-hover);
      border-color: rgba(16, 185, 129, 0.5);
    }

    .role-card.selected {
      background: rgba(16, 185, 129, 0.08);
      border-color: var(--color-accent-pitch);
    }

    .role-icon-box {
      font-size: 24px;
      flex-shrink: 0;
    }

    .role-info {
      flex: 1;
    }

    .role-name {
      font-size: 15px;
      font-weight: 700;
      color: var(--color-text-main);
      margin-bottom: 2px;
    }

    .role-desc {
      font-size: 12px;
      color: var(--color-text-muted);
      line-height: 1.4;
    }

    .role-check {
      flex-shrink: 0;
    }

    .radio-indicator {
      display: block;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 2px solid var(--color-border);
      position: relative;
      transition: border-color var(--transition-fast);
    }

    .role-card.selected .radio-indicator {
      border-color: var(--color-accent-pitch);
      background-color: var(--color-accent-pitch);
      box-shadow: inset 0 0 0 3px var(--color-surface);
    }

    /* Form Elements */
    .form-group {
      margin-bottom: 20px;
    }

    .form-label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: var(--color-text-main);
      margin-bottom: 6px;
    }

    .form-control {
      width: 100%;
      padding: 11px 14px;
      background-color: var(--color-surface-elevated);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      color: var(--color-text-main);
      font-size: 14px;
      transition: border-color var(--transition-fast);
    }

    .form-control:focus {
      outline: none;
      border-color: var(--color-accent-pitch);
    }

    .form-control.is-invalid {
      border-color: var(--color-danger);
    }

    .form-hint {
      display: block;
      font-size: 11.5px;
      color: var(--color-text-dim);
      margin-top: 4px;
      line-height: 1.4;
    }

    .form-error {
      color: var(--color-danger);
      font-size: 12px;
      margin-top: 4px;
    }

    /* Legal Consent Box */
    .legal-consent-card {
      background-color: rgba(99, 102, 241, 0.06);
      border: 1px solid rgba(99, 102, 241, 0.25);
      border-radius: var(--radius-sm);
      padding: 16px 18px;
      margin: 22px 0;
      transition: border-color var(--transition-fast);
    }

    .legal-consent-card.consent-error {
      border-color: var(--color-danger);
    }

    .consent-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .shield-icon {
      font-size: 18px;
    }

    .consent-title {
      font-family: var(--font-family-display);
      font-size: 13px;
      font-weight: 700;
      color: #C7D2FE;
    }

    .consent-text {
      font-size: 12px;
      color: #94A3B8;
      line-height: 1.5;
      margin-bottom: 12px;
    }

    .consent-checkbox-label {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      cursor: pointer;
    }

    .consent-checkbox {
      margin-top: 3px;
      width: 17px;
      height: 17px;
      accent-color: var(--color-accent-pitch);
      cursor: pointer;
    }

    .checkbox-text {
      font-size: 12.5px;
      color: var(--color-text-main);
      line-height: 1.45;
    }

    .consent-error-text {
      margin-top: 8px;
    }

    .btn-block {
      width: 100%;
      padding: 13px;
      margin-top: 10px;
    }
  `]
})
export class CompleteProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  isLoading = false;
  errorMessage: string | null = null;
  selectedRole: UserRole = 'TUTOR';

  profileForm: FormGroup = this.fb.group({
    role: ['TUTOR', [Validators.required]],
    phoneNumber: ['', [Validators.required, Validators.pattern(/^\+[1-9]\d{6,14}$/)]],
    acceptLegalConsent: [false],
    organizationName: [''],
    scoutRole: [''],
    linkedinUrl: ['']
  });

  ngOnInit(): void {
    this.updateRoleValidators('TUTOR');
  }

  setRole(role: UserRole): void {
    this.selectedRole = role;
    this.profileForm.get('role')?.setValue(role);
    this.updateRoleValidators(role);
  }

  private updateRoleValidators(role: UserRole): void {
    const consentControl = this.profileForm.get('acceptLegalConsent');
    if (role === 'TUTOR') {
      consentControl?.setValidators([Validators.requiredTrue]);
    } else {
      consentControl?.clearValidators();
    }
    consentControl?.updateValueAndValidity();
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.profileForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  onSubmit(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    const formVal = this.profileForm.value;
    const request: CompleteProfileRequest = {
      role: formVal.role,
      phoneNumber: formVal.phoneNumber,
      acceptLegalConsent: formVal.role === 'TUTOR' ? formVal.acceptLegalConsent : undefined,
      organizationName: formVal.organizationName || undefined,
      scoutRole: formVal.scoutRole || undefined,
      linkedinUrl: formVal.linkedinUrl || undefined
    };

    this.authService.completeProfile(request).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.role === 'SCOUT') {
          this.router.navigate(['/scout/directory']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Error al completar el perfil. Verifica los datos e intenta nuevamente.';
      }
    });
  }
}
