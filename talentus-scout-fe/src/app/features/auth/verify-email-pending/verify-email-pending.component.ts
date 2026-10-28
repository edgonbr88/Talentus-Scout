import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-verify-email-pending',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './verify-email-pending.component.html',
  styles: [`
    .verify-pending-container {
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
      padding: 44px 36px;
      max-width: 520px;
      width: 100%;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(16, 185, 129, 0.05);
    }

    .badge-wrapper {
      margin-bottom: 24px;
    }

    .shield-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #38bdf8;
      background: rgba(14, 165, 233, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.3);
      padding: 6px 14px;
      border-radius: 9999px;
    }

    .shield-icon {
      width: 14px;
      height: 14px;
    }

    .icon-circle {
      width: 76px;
      height: 76px;
      margin: 0 auto 24px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 78, 59, 0.4) 100%);
      border: 1px solid rgba(16, 185, 129, 0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 25px rgba(16, 185, 129, 0.2);
    }

    .mail-icon {
      width: 36px;
      height: 36px;
      color: #10b981;
    }

    .title {
      color: #f8fafc;
      font-size: 1.65rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin: 0 0 8px;
    }

    .subtitle {
      color: #94a3b8;
      font-size: 0.95rem;
      margin: 0 0 16px;
    }

    .email-pill {
      display: inline-block;
      background: #1e293b;
      border: 1px solid #334155;
      padding: 8px 18px;
      border-radius: 10px;
      margin-bottom: 20px;
    }

    .email-text {
      color: #38bdf8;
      font-weight: 700;
      font-size: 0.95rem;
      word-break: break-all;
    }

    .explanation {
      color: #64748b;
      font-size: 0.88rem;
      line-height: 1.55;
      margin: 0 0 28px;
    }

    .alert-success {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid #10b981;
      color: #a7f3d0;
      padding: 12px 16px;
      border-radius: 10px;
      font-size: 0.85rem;
      margin-bottom: 24px;
      text-align: left;
    }

    .alert-error {
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid #ef4444;
      color: #fca5a5;
      padding: 12px 16px;
      border-radius: 10px;
      font-size: 0.85rem;
      margin-bottom: 24px;
      text-align: left;
    }

    .alert-icon {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      color: #10b981;
    }

    .actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 28px;
    }

    .btn-resend {
      width: 100%;
      padding: 14px 20px;
      background: #10b981;
      color: #ffffff;
      border: none;
      border-radius: 12px;
      font-weight: 700;
      font-size: 0.95rem;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
    }

    .btn-resend:hover:not(:disabled) {
      background: #059669;
      transform: translateY(-1px);
    }

    .btn-resend:disabled {
      background: #334155;
      color: #94a3b8;
      cursor: not-allowed;
      box-shadow: none;
      transform: none;
    }

    .btn-back {
      color: #94a3b8;
      text-decoration: none;
      font-size: 0.88rem;
      font-weight: 600;
      padding: 8px;
      transition: color 0.2s;
    }

    .btn-back:hover {
      color: #f8fafc;
    }

    .legal-footnote {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding-top: 20px;
      border-top: 1px solid #1e293b;
      font-size: 0.75rem;
      color: #475569;
      line-height: 1.4;
    }

    .lock-icon {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
    }
  `]
})
export class VerifyEmailPendingComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);

  readonly email = signal<string>('');
  readonly isResending = signal<boolean>(false);
  readonly resendSuccess = signal<boolean>(false);
  readonly resendError = signal<string | null>(null);
  readonly cooldown = signal<number>(0);

  private timerInterval?: any;

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      if (params['email']) {
        this.email.set(params['email']);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  resendEmail(): void {
    const targetEmail = this.email();
    if (!targetEmail) {
      this.resendError.set('No se especificó un correo electrónico válido para el reenvío.');
      return;
    }

    this.isResending.set(true);
    this.resendSuccess.set(false);
    this.resendError.set(null);

    this.authService.resendVerificationEmail(targetEmail).subscribe({
      next: () => {
        this.isResending.set(false);
        this.resendSuccess.set(true);
        this.startCooldown(60);
      },
      error: (err) => {
        this.isResending.set(false);
        this.resendError.set(
          err?.error?.message || 'Ocurrió un error al intentar reenviar el correo. Inténtalo más tarde.'
        );
      }
    });
  }

  private startCooldown(seconds: number): void {
    this.cooldown.set(seconds);
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    this.timerInterval = setInterval(() => {
      const current = this.cooldown();
      if (current <= 1) {
        this.cooldown.set(0);
        clearInterval(this.timerInterval);
      } else {
        this.cooldown.set(current - 1);
      }
    }, 1000);
  }
}
