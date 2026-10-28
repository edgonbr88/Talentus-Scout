import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SocialAuthManagerService } from '../../../core/auth/social-auth-manager.service';

@Component({
  selector: 'app-oauth-config-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './oauth-config-modal.component.html',
  styles: [`
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 16px;
    }

    .modal-card {
      background: var(--color-surface, #0f172a);
      border: 1px solid var(--color-border, #1e293b);
      border-radius: var(--radius-md, 16px);
      width: 100%;
      max-width: 520px;
      padding: 28px 24px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
      animation: fadeInScale 0.2s ease-out;
    }

    @keyframes fadeInScale {
      from {
        opacity: 0;
        transform: scale(0.96);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    .modal-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 20px;
    }

    .modal-title {
      font-size: 18px;
      font-weight: 700;
      color: #f8fafc;
      margin: 0 0 6px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .modal-subtitle {
      font-size: 13px;
      color: #94a3b8;
      line-height: 1.5;
      margin: 0;
    }

    .btn-close {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 20px;
      cursor: pointer;
      padding: 4px;
      line-height: 1;
      border-radius: 4px;
    }

    .btn-close:hover {
      color: #f8fafc;
      background: rgba(255, 255, 255, 0.05);
    }

    .notice-box {
      background: rgba(56, 189, 248, 0.08);
      border: 1px solid rgba(56, 189, 248, 0.25);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 18px;
      font-size: 12.5px;
      color: #bae6fd;
      line-height: 1.45;
    }

    .notice-box strong {
      color: #38bdf8;
      display: block;
      margin-bottom: 4px;
    }

    .notice-box code {
      background: rgba(0, 0, 0, 0.35);
      padding: 2px 5px;
      border-radius: 4px;
      font-size: 11.5px;
      color: #7dd3fc;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      font-weight: 600;
      color: #e2e8f0;
      margin-bottom: 6px;
    }

    .form-control {
      width: 100%;
      box-sizing: border-box;
      background: #020617;
      border: 1px solid #334155;
      border-radius: 8px;
      color: #f8fafc;
      padding: 10px 12px;
      font-size: 13px;
      font-family: inherit;
      transition: border-color 0.15s ease;
    }

    .form-control:focus {
      outline: none;
      border-color: #10b981;
      box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
    }

    .form-hint {
      font-size: 11.5px;
      color: #64748b;
      margin-top: 4px;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #1e293b;
    }

    .btn {
      padding: 9px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-secondary {
      background: transparent;
      border: 1px solid #334155;
      color: #cbd5e1;
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.05);
      color: #fff;
    }

    .btn-primary {
      background: #10b981;
      border: 1px solid #10b981;
      color: #020617;
    }

    .btn-primary:hover {
      background: #059669;
      border-color: #059669;
    }
  `]
})
export class OauthConfigModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private socialAuthManager = inject(SocialAuthManagerService);

  @Input() targetProvider: 'google' | 'microsoft' | 'all' = 'all';
  @Output() saved = new EventEmitter<'google' | 'microsoft' | 'all'>();
  @Output() closed = new EventEmitter<void>();

  configForm: FormGroup = this.fb.group({
    googleClientId: [''],
    microsoftClientId: ['']
  });

  ngOnInit(): void {
    this.configForm.patchValue({
      googleClientId: this.socialAuthManager.getGoogleClientId(),
      microsoftClientId: this.socialAuthManager.getMicrosoftClientId()
    });
  }

  saveConfig(): void {
    const { googleClientId, microsoftClientId } = this.configForm.value;
    if (googleClientId !== undefined) {
      this.socialAuthManager.setGoogleClientId(googleClientId);
    }
    if (microsoftClientId !== undefined) {
      this.socialAuthManager.setMicrosoftClientId(microsoftClientId);
    }
    this.saved.emit(this.targetProvider);
  }

  closeModal(): void {
    this.closed.emit();
  }
}
