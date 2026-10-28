import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { BrandLogoComponent } from '../../../shared/components/brand-logo/brand-logo.component';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, BrandLogoComponent],
  templateUrl: './reset-password.component.html',
  styles: [`
    .auth-wrapper {
      min-height: calc(100vh - 180px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }

    .auth-card {
      width: 100%;
      max-width: 480px;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(51, 65, 85, 0.7);
      border-radius: 20px;
      padding: 40px 32px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(16, 185, 129, 0.05);
    }

    .auth-header {
      margin-bottom: 24px;
      text-align: center;
    }

    .badge-verified {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #38bdf8;
      background: rgba(14, 165, 233, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.3);
      padding: 5px 12px;
      border-radius: 9999px;
      margin-bottom: 14px;
    }

    .auth-title {
      font-size: 1.55rem;
      font-weight: 800;
      color: #f8fafc;
      margin: 0 0 8px;
      letter-spacing: -0.02em;
    }

    .auth-subtitle {
      font-size: 0.9rem;
      color: #94a3b8;
      margin: 0;
      line-height: 1.5;
    }

    .alert {
      padding: 14px 16px;
      border-radius: 10px;
      font-size: 0.88rem;
      line-height: 1.45;
      margin-bottom: 20px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .alert-danger {
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.35);
      color: #fca5a5;
    }

    .alert-success-card {
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.25);
      border-radius: 14px;
      padding: 28px 20px;
      text-align: center;
      margin-bottom: 20px;
    }

    .success-icon-wrap {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      margin: 0 auto 16px;
    }

    .success-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #10b981;
      margin: 0 0 8px;
    }

    .success-text {
      font-size: 0.92rem;
      color: #cbd5e1;
      margin: 0 0 20px;
      line-height: 1.5;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-label {
      display: block;
      font-size: 0.875rem;
      font-weight: 600;
      color: #cbd5e1;
      margin-bottom: 8px;
    }

    .input-wrapper {
      position: relative;
    }

    .form-control {
      width: 100%;
      box-sizing: border-box;
      padding: 12px 42px 12px 16px;
      background: #0b1329;
      border: 1px solid #334155;
      border-radius: 10px;
      color: #f8fafc;
      font-size: 0.95rem;
      transition: all 0.2s ease;
      outline: none;
    }

    .form-control:focus {
      border-color: #10b981;
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
    }

    .form-control.is-invalid {
      border-color: #ef4444;
      background: rgba(239, 68, 68, 0.05);
    }

    .btn-toggle-pwd {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 16px;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .form-error {
      color: #f87171;
      font-size: 0.8rem;
      margin-top: 6px;
    }

    .password-hint {
      font-size: 0.78rem;
      color: #94a3b8;
      margin-top: 6px;
    }

    .btn-submit {
      width: 100%;
      padding: 13px 20px;
      background: #10b981;
      color: #0a0f1d;
      font-weight: 700;
      font-size: 0.95rem;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.25);
    }

    .btn-submit:hover:not(:disabled) {
      background: #059669;
      transform: translateY(-1px);
    }

    .btn-submit:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .auth-footer {
      margin-top: 28px;
      padding-top: 20px;
      border-top: 1px solid rgba(51, 65, 85, 0.6);
      text-align: center;
      font-size: 0.88rem;
      color: #94a3b8;
    }

    .link-action {
      color: #38bdf8;
      font-weight: 600;
      text-decoration: none;
      transition: color 0.15s ease;
    }

    .link-action:hover {
      color: #7dd3fc;
      text-decoration: underline;
    }
  `]
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  token = signal<string | null>(null);
  isLoading = signal(false);
  isSuccess = signal(false);
  errorMessage = signal<string | null>(null);
  showNewPassword = signal(false);
  showConfirmPassword = signal(false);

  resetForm: FormGroup = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: this.passwordMatchValidator });

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('newPassword')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    if (password && confirmPassword && password !== confirmPassword) {
      return { passwordMismatch: true };
    }
    return null;
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const tokenParam = params['token'];
      if (tokenParam && tokenParam.trim().length > 0) {
        this.token.set(tokenParam.trim());
      } else {
        this.errorMessage.set('El enlace no contiene un token de restablecimiento válido.');
      }
    });
  }

  isFieldInvalid(field: string): boolean {
    const control = this.resetForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  get isMismatch(): boolean {
    return !!(this.resetForm.hasError('passwordMismatch') &&
      this.resetForm.get('confirmPassword')?.touched);
  }

  toggleNewPassword(): void {
    this.showNewPassword.update(v => !v);
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword.update(v => !v);
  }

  onSubmit(): void {
    if (this.resetForm.invalid || this.isLoading() || !this.token()) {
      this.resetForm.markAllAsTouched();
      return;
    }

    const { newPassword, confirmPassword } = this.resetForm.value;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.resetPassword({
      token: this.token()!,
      newPassword,
      confirmPassword
    }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.isSuccess.set(true);
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'El enlace de recuperación es inválido o ha expirado.');
      }
    });
  }
}
