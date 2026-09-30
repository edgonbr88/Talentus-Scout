import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-wrapper">
      <div class="auth-card">
        <div class="auth-header">
          <span class="badge badge-verified">PORTAL DE ACCESO</span>
          <h1 class="auth-title">Iniciar Sesión</h1>
          <p class="auth-subtitle">Ingresa con tus credenciales de representante o scout certificado</p>
        </div>

        @if (errorMessage) {
          <div class="alert alert-danger" role="alert">
            <span>⚠️</span>
            <span>{{ errorMessage }}</span>
          </div>
        }

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="auth-form" novalidate>
          <div class="form-group">
            <label for="email" class="form-label">Correo electrónico</label>
            <input
              id="email"
              type="email"
              formControlName="email"
              class="form-control"
              [class.is-invalid]="isFieldInvalid('email')"
              placeholder="nombre@ejemplo.com"
              autocomplete="email"
            />
            @if (isFieldInvalid('email')) {
              <div class="form-error">
                <span>Ingresa un correo electrónico válido</span>
              </div>
            }
          </div>

          <div class="form-group">
            <label for="password" class="form-label">Contraseña</label>
            <input
              id="password"
              type="password"
              formControlName="password"
              class="form-control"
              [class.is-invalid]="isFieldInvalid('password')"
              placeholder="••••••••"
              autocomplete="current-password"
            />
            @if (isFieldInvalid('password')) {
              <div class="form-error">
                <span>La contraseña es obligatoria</span>
              </div>
            }
          </div>

          <button
            type="submit"
            class="btn btn-primary btn-block"
            [disabled]="loginForm.invalid || isLoading"
          >
            @if (isLoading) {
              <span>Verificando credenciales...</span>
            } @else {
              <span>Entrar a mi Cuenta</span>
            }
          </button>
        </form>

        <div class="auth-footer">
          <p>¿Aún no tienes cuenta registrada?</p>
          <a routerLink="/register-tutor" class="link-register">
            Crear cuenta de Tutor Legal con consentimiento LOPNNA
          </a>
        </div>
      </div>
    </div>
  `,
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
      max-width: 440px;
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 36px 32px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
    }

    .auth-header {
      margin-bottom: 28px;
      text-align: left;
    }

    .auth-title {
      font-size: 24px;
      margin: 10px 0 6px;
    }

    .auth-subtitle {
      font-size: 14px;
      color: var(--color-text-muted);
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
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  isLoading = false;
  errorMessage: string | null = null;

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        if (err.status === 401) {
          this.errorMessage = 'Correo electrónico o contraseña incorrectos.';
        } else {
          this.errorMessage = err.error?.message || 'No se pudo conectar con el servidor. Revisa tu conexión.';
        }
      }
    });
  }
}
