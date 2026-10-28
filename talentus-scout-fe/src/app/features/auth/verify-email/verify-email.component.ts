import { Component, inject, signal, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './verify-email.component.html',
  styles: [`
    .verify-page-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: radial-gradient(circle at 50% 0%, #1e293b 0%, #0b1120 70%, #030712 100%);
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }

    .verify-card {
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(51, 65, 85, 0.7);
      border-radius: 20px;
      padding: 48px 36px;
      max-width: 500px;
      width: 100%;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }

    .status-box {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .spinner-radar {
      width: 64px;
      height: 64px;
      border: 3px solid rgba(16, 185, 129, 0.2);
      border-top-color: #10b981;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 24px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .success-icon-wrap {
      width: 76px;
      height: 76px;
      border-radius: 50%;
      background: rgba(16, 185, 129, 0.15);
      border: 2px solid #10b981;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 24px;
      box-shadow: 0 0 30px rgba(16, 185, 129, 0.3);
    }

    .check-icon {
      width: 40px;
      height: 40px;
      color: #10b981;
    }

    .error-icon-wrap {
      width: 76px;
      height: 76px;
      border-radius: 50%;
      background: rgba(239, 68, 68, 0.15);
      border: 2px solid #ef4444;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 24px;
      box-shadow: 0 0 30px rgba(239, 68, 68, 0.25);
    }

    .alert-icon {
      width: 40px;
      height: 40px;
      color: #ef4444;
    }

    .title {
      font-size: 1.55rem;
      font-weight: 800;
      color: #f8fafc;
      margin: 0 0 10px;
      letter-spacing: -0.02em;
    }

    .success-title {
      color: #34d399;
    }

    .error-title {
      color: #f87171;
    }

    .subtitle {
      color: #94a3b8;
      font-size: 0.95rem;
      line-height: 1.55;
      margin: 0 0 28px;
    }

    .redirect-notice {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
      color: #a7f3d0;
      margin-bottom: 24px;
      background: rgba(16, 185, 129, 0.1);
      padding: 8px 16px;
      border-radius: 8px;
    }

    .redirect-pulse {
      width: 8px;
      height: 8px;
      background-color: #10b981;
      border-radius: 50%;
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(1.4); }
    }

    .actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
    }

    .btn-primary {
      width: 100%;
      padding: 14px 20px;
      background: #10b981;
      color: #ffffff;
      border: none;
      border-radius: 12px;
      font-weight: 700;
      font-size: 0.95rem;
      cursor: pointer;
      text-decoration: none;
      display: inline-block;
      transition: all 0.2s;
      box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
    }

    .btn-primary:hover {
      background: #059669;
      transform: translateY(-1px);
    }

    .btn-secondary {
      color: #94a3b8;
      text-decoration: none;
      font-size: 0.88rem;
      font-weight: 600;
      padding: 8px;
      transition: color 0.2s;
    }

    .btn-secondary:hover {
      color: #f8fafc;
    }
  `]
})
export class VerifyEmailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);

  readonly isLoading = signal<boolean>(true);
  readonly isSuccess = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      // En SSR permanecemos en estado de carga; no ejecutar mutaciones ni llamadas HTTP en el servidor
      return;
    }

    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.isLoading.set(false);
      this.errorMessage.set('No se proporcionó un token de verificación válido en la solicitud.');
      return;
    }

    this.authService.verifyEmail(token).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.isSuccess.set(true);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err?.error?.message || 'El enlace de verificación ha expirado o ya fue utilizado.'
        );
      }
    });
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
