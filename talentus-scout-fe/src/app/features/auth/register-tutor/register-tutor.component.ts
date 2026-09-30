import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-register-tutor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-wrapper">
      <div class="auth-card register-card">
        <div class="auth-header">
          <span class="badge badge-lopnna">REGISTRO DE REPRESENTANTE LEGAL</span>
          <h1 class="auth-title">Crear Cuenta de Tutor</h1>
          <p class="auth-subtitle">
            Habilita la administración segura y oficial de las cédulas deportivas de tus atletas menores de edad.
          </p>
        </div>

        @if (errorMessage) {
          <div class="alert alert-danger" role="alert">
            <span>⚠️</span>
            <span>{{ errorMessage }}</span>
          </div>
        }

        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="auth-form" novalidate>
          <!-- Nombre Completo -->
          <div class="form-group">
            <label for="fullName" class="form-label">Nombre y apellido del tutor</label>
            <input
              id="fullName"
              type="text"
              formControlName="fullName"
              class="form-control"
              [class.is-invalid]="isFieldInvalid('fullName')"
              placeholder="Ej: Carlos Eduardo Mendoza"
              autocomplete="name"
            />
            @if (isFieldInvalid('fullName')) {
              <div class="form-error">
                <span>El nombre completo es obligatorio</span>
              </div>
            }
          </div>

          <!-- Correo Electrónico -->
          <div class="form-group">
            <label for="email" class="form-label">Correo electrónico</label>
            <input
              id="email"
              type="email"
              formControlName="email"
              class="form-control"
              [class.is-invalid]="isFieldInvalid('email')"
              placeholder="carlos.mendoza@correo.com"
              autocomplete="email"
            />
            @if (isFieldInvalid('email')) {
              <div class="form-error">
                <span>Ingresa un correo electrónico válido</span>
              </div>
            }
          </div>

          <!-- Teléfono Internacional E.164 -->
          <div class="form-group">
            <label for="phoneNumber" class="form-label">Teléfono de contacto (Formato Internacional)</label>
            <input
              id="phoneNumber"
              type="tel"
              formControlName="phoneNumber"
              class="form-control"
              [class.is-invalid]="isFieldInvalid('phoneNumber')"
              placeholder="+584121234567"
              autocomplete="tel"
            />
            <span class="form-hint">Debe incluir código de país (ej: +58 para Venezuela, seguido del código de área y número).</span>
            @if (isFieldInvalid('phoneNumber')) {
              <div class="form-error">
                <span>El formato debe ser internacional E.164 (ej: +584121234567)</span>
              </div>
            }
          </div>

          <!-- Contraseña -->
          <div class="form-group">
            <label for="password" class="form-label">Contraseña (Mínimo 8 caracteres)</label>
            <input
              id="password"
              type="password"
              formControlName="password"
              class="form-control"
              [class.is-invalid]="isFieldInvalid('password')"
              placeholder="••••••••"
              autocomplete="new-password"
            />
            @if (isFieldInvalid('password')) {
              <div class="form-error">
                <span>La contraseña debe contener al menos 8 caracteres</span>
              </div>
            }
          </div>

          <!-- TARJETA DE CONSENTIMIENTO LOPNNA ART. 65 -->
          <div class="lopnna-consent-card" [class.consent-error]="isFieldInvalid('acceptLopnnaTerms')">
            <div class="consent-header">
              <span class="shield-icon">🛡️</span>
              <span class="consent-title">Marco de Protección Legal al Menor (LOPNNA Art. 65)</span>
            </div>
            <p class="consent-text">
              Conforme al Artículo 65 de la Ley Orgánica para la Protección de Niños, Niñas y Adolescentes (Venezuela), 
              ninguna plataforma deportiva puede registrar datos biométricos, deportivos o audiovisuales de menores de edad 
              sin la debida autorización expresa y verificable de su representante legal con patria potestad.
            </p>
            <label class="consent-checkbox-label">
              <input
                type="checkbox"
                formControlName="acceptLopnnaTerms"
                class="consent-checkbox"
              />
              <span class="checkbox-text">
                Declaro bajo fe de juramento que soy el padre, madre o tutor legal con patria potestad del menor, 
                y autorizo expresamente la gestión y publicación de su cédula deportiva en Talentus Scout.
              </span>
            </label>
            @if (isFieldInvalid('acceptLopnnaTerms')) {
              <div class="form-error consent-error-text">
                <span>Debe aceptar obligatoriamente los términos de protección LOPNNA para continuar</span>
              </div>
            }
          </div>

          <button
            type="submit"
            class="btn btn-primary btn-block"
            [disabled]="registerForm.invalid || isLoading"
          >
            @if (isLoading) {
              <span>Registrando y verificando...</span>
            } @else {
              <span>Crear Cuenta de Tutor Legal</span>
            }
          </button>
        </form>

        <div class="auth-footer">
          <p>¿Ya tienes una cuenta registrada?</p>
          <a routerLink="/login" class="link-login">
            Iniciar sesión con tu correo
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

    .register-card {
      width: 100%;
      max-width: 540px;
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 36px 32px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
    }

    .auth-header {
      margin-bottom: 24px;
    }

    .auth-title {
      font-size: 24px;
      margin: 10px 0 6px;
    }

    .auth-subtitle {
      font-size: 14px;
      color: var(--color-text-muted);
    }

    /* Tarjeta interactiva de consentimiento LOPNNA */
    .lopnna-consent-card {
      background-color: #0E1527;
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: var(--radius-sm);
      padding: 18px 20px;
      margin: 24px 0;
      transition: border-color var(--transition-fast);
    }

    .lopnna-consent-card.consent-error {
      border-color: var(--color-danger);
    }

    .consent-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
    }

    .shield-icon {
      font-size: 18px;
    }

    .consent-title {
      font-family: var(--font-family-display);
      font-size: 13px;
      font-weight: 700;
      color: #818CF8;
      letter-spacing: 0.02em;
    }

    .consent-text {
      font-size: 12px;
      line-height: 1.5;
      color: var(--color-text-muted);
      margin-bottom: 14px;
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
      flex-shrink: 0;
    }

    .checkbox-text {
      font-size: 13px;
      font-weight: 500;
      color: var(--color-text-main);
      line-height: 1.4;
    }

    .consent-error-text {
      margin-top: 10px;
    }

    .btn-block {
      width: 100%;
      padding: 13px;
      margin-top: 6px;
    }

    .auth-footer {
      margin-top: 24px;
      padding-top: 18px;
      border-top: 1px solid var(--color-border);
      text-align: center;
      font-size: 13px;
    }

    .auth-footer p {
      margin-bottom: 4px;
    }

    .link-login {
      font-weight: 600;
      color: var(--color-accent-pitch);
      display: inline-block;
    }

    .link-login:hover {
      text-decoration: underline;
    }
  `]
})
export class RegisterTutorComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  isLoading = false;
  errorMessage: string | null = null;

  registerForm: FormGroup = this.fb.group({
    fullName: ['', [Validators.required, Validators.maxLength(150)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    phoneNumber: ['', [Validators.required, Validators.pattern(/^\+[1-9]\d{7,14}$/)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(100)]],
    acceptLopnnaTerms: [false, [Validators.requiredTrue]]
  });

  isFieldInvalid(fieldName: string): boolean {
    const field = this.registerForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    this.authService.registerTutor(this.registerForm.value).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/dashboard']);
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
