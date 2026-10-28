import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CertificationService } from '../../core/services/certification.service';
import { PublicTokenCertificationResponse, SubmitTokenCertificationRequest } from '../../core/models/certification.model';
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component';

@Component({
  selector: 'app-public-certifier',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, BrandLogoComponent],
  templateUrl: './public-certifier.component.html',
  styles: [`
    .certifier-container {
      min-height: 100vh;
      background-color: var(--color-bg, #080D1A);
      color: var(--color-text-main, #F8FAFC);
      padding: 40px 16px;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      font-family: var(--font-family-sans, -apple-system, sans-serif);
    }

    .certifier-wrapper {
      width: 100%;
      max-width: 680px;
    }

    .cert-header {
      text-align: center;
      margin-bottom: 28px;
    }

    .brand-badge {
      display: inline-block;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.35);
      color: #10B981;
      padding: 4px 12px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      border-radius: 9999px;
      margin-bottom: 10px;
    }

    .brand-title {
      font-size: 26px;
      font-weight: 900;
      letter-spacing: 0.04em;
      margin: 0;
      text-transform: uppercase;
    }

    .pitch-accent {
      color: #10B981;
    }

    .brand-subtitle {
      font-size: 13px;
      color: #94A3B8;
      margin-top: 6px;
    }

    .loading-box {
      background: #0E1527;
      border: 1px solid #1E293B;
      border-radius: 12px;
      padding: 40px;
      text-align: center;
      color: #94A3B8;
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(16, 185, 129, 0.2);
      border-top-color: #10B981;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .athlete-card {
      background: #0E1527;
      border: 1px solid #1E293B;
      border-radius: 12px;
      padding: 22px;
      margin-bottom: 24px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
    }

    .athlete-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 18px;
    }

    .athlete-avatar {
      width: 52px;
      height: 52px;
      background: linear-gradient(135deg, #10B981, #047857);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      font-weight: 800;
      color: #FFFFFF;
      flex-shrink: 0;
    }

    .category-badge {
      background: rgba(99, 102, 241, 0.2);
      border: 1px solid rgba(99, 102, 241, 0.4);
      color: #A5B4FC;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
      display: inline-block;
      margin-bottom: 4px;
    }

    .athlete-name {
      font-size: 20px;
      font-weight: 800;
      margin: 0 0 4px;
      color: #FFFFFF;
    }

    .athlete-meta {
      font-size: 13px;
      color: #94A3B8;
      margin: 0;
    }

    .request-summary {
      background: #090E1B;
      border: 1px solid #1A243D;
      border-radius: 8px;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .summary-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
    }

    .summary-label {
      color: #64748B;
      font-weight: 600;
    }

    .summary-value {
      color: #E2E8F0;
      font-weight: 700;
    }

    .highlight-gold {
      color: #F59E0B;
    }

    .cert-form {
      background: #0E1527;
      border: 1px solid #1E293B;
      border-radius: 12px;
      padding: 26px 24px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    }

    .form-section-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
      font-weight: 700;
      color: #E2E8F0;
      margin: 18px 0 14px;
      letter-spacing: 0.02em;
    }

    .form-section-title:first-child {
      margin-top: 0;
    }

    .form-section-title span {
      background: #10B981;
      color: #080D1A;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 800;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
    }

    @media (min-width: 600px) {
      .form-grid {
        grid-template-columns: 1fr 1fr;
      }
    }

    .form-grid-4 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    @media (min-width: 600px) {
      .form-grid-4 {
        grid-template-columns: 1fr 1fr 1fr 1fr;
      }
    }

    .form-group {
      margin-bottom: 14px;
    }

    .form-label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: #94A3B8;
      margin-bottom: 6px;
    }

    .form-input {
      width: 100%;
      background: #090E1B;
      border: 1px solid #1E293B;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 14px;
      color: #FFFFFF;
      box-sizing: border-box;
      transition: border-color 0.2s;
    }

    .form-input:focus {
      outline: none;
      border-color: #10B981;
    }

    .form-textarea {
      resize: vertical;
      font-family: inherit;
    }

    .oath-card {
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.25);
      border-radius: 8px;
      padding: 14px;
      margin: 20px 0;
    }

    .oath-label {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      cursor: pointer;
    }

    .oath-checkbox {
      margin-top: 3px;
      accent-color: #10B981;
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      cursor: pointer;
    }

    .oath-text {
      font-size: 12px;
      color: #CBD5E1;
      line-height: 1.5;
    }

    .btn-submit {
      width: 100%;
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
      color: #FFFFFF;
      border: none;
      border-radius: 8px;
      padding: 14px;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      transition: transform 0.2s, opacity 0.2s;
      box-shadow: 0 4px 15px rgba(16, 185, 129, 0.35);
    }

    .btn-submit:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    .btn-submit:not(:disabled):hover {
      transform: translateY(-2px);
    }

    .alert-box {
      border-radius: 8px;
      padding: 16px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 20px;
    }

    .alert-error {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #FCA5A5;
    }

    .alert-success {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #6EE7B7;
    }

    .alert-warning {
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.3);
      color: #FCD34D;
    }

    .alert-icon {
      font-size: 18px;
      flex-shrink: 0;
    }

    .alert-content h3 {
      margin: 0 0 4px;
      font-size: 14px;
    }

    .alert-content p {
      margin: 0;
      font-size: 13px;
      line-height: 1.4;
    }

    .success-card {
      background: #0E1527;
      border: 1px solid #10B981;
      border-radius: 12px;
      padding: 40px 24px;
      text-align: center;
      box-shadow: 0 10px 40px rgba(16, 185, 129, 0.15);
    }

    .seal-gold-wrapper {
      margin-bottom: 20px;
    }

    .seal-icon {
      font-size: 48px;
      margin-bottom: 8px;
    }

    .seal-text {
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid #F59E0B;
      color: #F59E0B;
      font-size: 11px;
      font-weight: 800;
      padding: 4px 12px;
      border-radius: 9999px;
      letter-spacing: 0.1em;
    }

    .success-card h2 {
      font-size: 22px;
      margin: 12px 0 8px;
      color: #FFFFFF;
    }

    .success-desc {
      font-size: 14px;
      color: #94A3B8;
      max-width: 500px;
      margin: 0 auto 26px;
      line-height: 1.6;
    }

    .btn-view-profile {
      display: inline-block;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #FFFFFF;
      text-decoration: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      transition: background 0.2s;
    }

    .btn-view-profile:hover {
      background: rgba(255, 255, 255, 0.18);
    }
  `]
})
export class PublicCertifierComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private certService = inject(CertificationService);
  private fb = inject(FormBuilder);

  token = '';
  tokenData: PublicTokenCertificationResponse | null = null;
  isLoading = true;
  isSubmitting = false;
  isSuccess = false;
  errorMessage = '';
  submitError = '';

  certForm: FormGroup = this.fb.group({
    certifierFullName: ['', [Validators.required, Validators.maxLength(150)]],
    certifierLicenseId: ['', [Validators.required, Validators.maxLength(100)]],
    certifierNotes: [''],
    heightCm: [null],
    weightKg: [null],
    bodyFatPercent: [null],
    muscleMassKg: [null],
    tournamentName: [''],
    achievementTitle: [''],
    goalsScored: [null],
    acceptDeclaration: [false, [Validators.requiredTrue]]
  });

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    if (!this.token) {
      this.errorMessage = 'No se especificó un token de certificación en el enlace.';
      this.isLoading = false;
      return;
    }

    this.loadTokenData();
  }

  loadTokenData(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.certService.getPublicCertificationByToken(this.token).subscribe({
      next: (data) => {
        this.tokenData = data;
        this.isLoading = false;
        if (data.targetName) {
          this.certForm.patchValue({ certifierFullName: data.targetName });
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'El enlace de certificación no es válido, ya fue utilizado o ha expirado.';
      }
    });
  }

  isMedical(): boolean {
    return this.tokenData?.badgeType === 'MEDICAL_ANTHRO';
  }

  isSportAchievement(): boolean {
    return this.tokenData?.badgeType === 'SPORT_ACHIEVEMENT';
  }

  onSubmit(): void {
    if (this.certForm.invalid || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    this.submitError = '';

    const val = this.certForm.value;
    const req: SubmitTokenCertificationRequest = {
      certifierFullName: val.certifierFullName,
      certifierLicenseId: val.certifierLicenseId,
      certifierNotes: val.certifierNotes,
      heightCm: val.heightCm,
      weightKg: val.weightKg,
      bodyFatPercent: val.bodyFatPercent,
      muscleMassKg: val.muscleMassKg,
      goalsScored: val.goalsScored,
      tournamentName: val.tournamentName,
      achievementTitle: val.achievementTitle
    };

    this.certService.submitTokenCertification(this.token, req).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.isSuccess = true;
      },
      error: (err) => {
        this.isSubmitting = false;
        this.submitError = err.error?.message || 'Ocurrió un error al registrar la certificación. Intente nuevamente.';
      }
    });
  }
}
