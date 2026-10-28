import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { SocialAuthManagerService } from '../../../core/auth/social-auth-manager.service';
import { OauthConfigModalComponent } from '../../../shared/components/oauth-config-modal/oauth-config-modal.component';
import { BrandLogoComponent } from '../../../shared/components/brand-logo/brand-logo.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, OauthConfigModalComponent, BrandLogoComponent],
  templateUrl: './login.component.html',
  styles: [`
    .auth-wrapper {
      min-height: calc(100vh - 180px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
    }

    .auth-card {
      width: 100%;
      max-width: 460px;
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 36px 32px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
    }

    .auth-header {
      margin-bottom: 24px;
      text-align: left;
    }

    .auth-title {
      font-size: 24px;
      margin: 10px 0 6px;
    }

    .auth-subtitle {
      font-size: 14px;
      color: var(--color-text-muted);
      line-height: 1.5;
    }

    /* Social Auth Buttons */
    .social-auth-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 20px;
    }

    .btn-social {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      width: 100%;
      padding: 12px 16px;
      background-color: var(--color-surface-elevated);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      color: var(--color-text-main);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .btn-social:hover:not(:disabled) {
      background-color: var(--color-surface-hover);
      border-color: var(--color-text-muted);
      transform: translateY(-1px);
    }

    .btn-social:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .social-icon {
      flex-shrink: 0;
    }

    .oauth-config-trigger {
      margin-top: 4px;
      text-align: center;
    }

    .btn-config-oauth {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 12px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 8px;
      border-radius: 4px;
      transition: color 0.15s ease;
    }

    .btn-config-oauth:hover {
      color: #38bdf8;
      text-decoration: underline;
    }

    /* Divider */
    .auth-divider {
      display: flex;
      align-items: center;
      text-align: center;
      margin: 18px 0;
    }

    .auth-divider::before,
    .auth-divider::after {
      content: '';
      flex: 1;
      border-bottom: 1px solid var(--color-border);
    }

    .auth-divider span {
      padding: 0 12px;
      color: var(--color-text-dim);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .btn-block {
      width: 100%;
      padding: 13px;
      margin-top: 10px;
    }

    .auth-footer {
      margin-top: 28px;
      padding-top: 20px;
      border-top: 1px solid var(--color-border);
      text-align: center;
      font-size: 13px;
    }

    .auth-footer p {
      margin-bottom: 6px;
    }

    .link-register {
      font-weight: 600;
      color: var(--color-accent-pitch);
      display: inline-block;
    }

    .link-register:hover {
      text-decoration: underline;
    }
  `]
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private socialAuthManager = inject(SocialAuthManagerService);
  private router = inject(Router);

  isLoading = false;
  errorMessage: string | null = null;
  unverifiedEmail: string | null = null;

  showConfigModal = false;
  configModalProvider: 'google' | 'microsoft' | 'all' = 'all';

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  ngOnInit(): void {
    // Si la ventana fue abierta como popup de retorno OAuth (#id_token=...), procesa y cierra
    if (this.socialAuthManager.handleOAuthCallbackIfPresent()) {
      return;
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  loginWithGoogle(): void {
    if (!this.socialAuthManager.hasGoogleClientId()) {
      this.openConfigModal('google');
      return;
    }
    this.startOAuthFlow('google');
  }

  loginWithMicrosoft(): void {
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
    this.unverifiedEmail = null;

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
              if (res.role === 'ADMIN') {
                this.router.navigate(['/admin/scouts']);
              } else if (res.role === 'SCOUT') {
                if (this.authService.isVerifiedScout()) {
                  this.router.navigate(['/scout/directory']);
                } else {
                  this.router.navigate(['/auth/scout-pending-audit']);
                }
              } else {
                this.router.navigate(['/dashboard']);
              }
            }
          },
          error: (err) => {
            this.isLoading = false;
            this.errorMessage = err.error?.message || `Error al procesar la autenticación con ${provider === 'google' ? 'Google' : 'Microsoft'} en el servidor.`;
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
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.unverifiedEmail = null;

    this.authService.login(this.loginForm.value).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.role === 'ADMIN') {
          this.router.navigate(['/admin/scouts']);
        } else if (res.role === 'SCOUT') {
          if (this.authService.isVerifiedScout()) {
            this.router.navigate(['/scout/directory']);
          } else {
            this.router.navigate(['/auth/scout-pending-audit']);
          }
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.isLoading = false;
        if (err.status === 403 && (err.error?.errorCode === 'ACCOUNT_NOT_VERIFIED' || err.error?.message?.includes('verificada'))) {
          this.unverifiedEmail = this.loginForm.get('email')?.value;
          this.errorMessage = null;
        } else if (err.status === 401) {
          this.errorMessage = 'Correo electrónico o contraseña incorrectos.';
        } else {
          this.errorMessage = err.error?.message || 'No se pudo conectar con el servidor. Revisa tu conexión.';
        }
      }
    });
  }
}
