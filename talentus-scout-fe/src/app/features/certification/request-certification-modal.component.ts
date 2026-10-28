import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CertificationService } from '../../core/services/certification.service';
import { BadgeType } from '../../core/models/athlete.model';

@Component({
  selector: 'app-request-certification-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './request-certification-modal.component.html',
  styles: [`
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(4, 7, 15, 0.85);
      backdrop-filter: blur(8px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      box-sizing: border-box;
    }

    .modal-dialog {
      background: #0E1527;
      border: 1px solid #1E293B;
      border-radius: 14px;
      width: 100%;
      max-width: 620px;
      max-height: 90vh;
      overflow-y: auto;
      padding: 24px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
      border-bottom: 1px solid #1E293B;
      padding-bottom: 14px;
    }

    .badge-mini {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #10B981;
      font-size: 10px;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 4px;
      letter-spacing: 0.05em;
    }

    .modal-title {
      font-size: 20px;
      font-weight: 800;
      color: #FFFFFF;
      margin: 4px 0 2px;
    }

    .modal-subtitle {
      font-size: 13px;
      color: #94A3B8;
      margin: 0;
    }

    .btn-close {
      background: none;
      border: none;
      font-size: 26px;
      color: #64748B;
      cursor: pointer;
      line-height: 1;
      padding: 0;
    }

    .btn-close:hover {
      color: #FFFFFF;
    }

    .step-container {
      margin-bottom: 18px;
    }

    .step-label {
      display: block;
      font-size: 12px;
      font-weight: 700;
      color: #CBD5E1;
      margin-bottom: 8px;
      letter-spacing: 0.02em;
    }

    .category-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .category-card {
      background: #090E1B;
      border: 1px solid #1E293B;
      border-radius: 10px;
      padding: 12px;
      text-align: left;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .category-card:hover {
      border-color: #334155;
    }

    .category-card.active {
      border-color: #10B981;
      background: rgba(16, 185, 129, 0.08);
    }

    .category-icon {
      font-size: 20px;
      margin-bottom: 2px;
    }

    .category-title {
      font-size: 13px;
      font-weight: 700;
      color: #FFFFFF;
    }

    .category-desc {
      font-size: 11px;
      color: #64748B;
      line-height: 1.3;
    }

    .method-toggle {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .method-btn {
      background: #090E1B;
      border: 1px solid #1E293B;
      border-radius: 8px;
      padding: 10px;
      text-align: left;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .method-btn span {
      font-size: 13px;
      font-weight: 700;
      color: #E2E8F0;
    }

    .method-btn small {
      font-size: 11px;
      color: #64748B;
      line-height: 1.2;
    }

    .method-btn.active {
      border-color: #38BDF8;
      background: rgba(56, 189, 248, 0.08);
    }

    .modal-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .form-label {
      font-size: 11px;
      font-weight: 600;
      color: #94A3B8;
    }

    .form-input {
      background: #090E1B;
      border: 1px solid #1E293B;
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 13px;
      color: #FFFFFF;
      box-sizing: border-box;
      width: 100%;
    }

    .form-input:focus {
      outline: none;
      border-color: #10B981;
    }

    .form-textarea {
      resize: vertical;
      font-family: inherit;
    }

    .error-banner {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #FCA5A5;
      padding: 10px;
      border-radius: 6px;
      font-size: 12px;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 14px;
      padding-top: 12px;
      border-top: 1px solid #1E293B;
    }

    .btn-cancel {
      background: transparent;
      border: 1px solid #334155;
      color: #CBD5E1;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
    }

    .btn-confirm {
      background: #10B981;
      border: none;
      color: #080D1A;
      padding: 8px 18px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 700;
    }

    .btn-confirm:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .success-box {
      text-align: center;
      padding: 24px 0;
    }

    .success-icon {
      width: 48px;
      height: 48px;
      background: rgba(16, 185, 129, 0.2);
      border: 2px solid #10B981;
      border-radius: 50%;
      color: #10B981;
      font-size: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 12px;
    }

    .link-share-box {
      background: #090E1B;
      border: 1px solid #1E293B;
      border-radius: 8px;
      padding: 14px;
      margin: 18px 0;
      text-align: left;
    }

    .link-share-box label {
      font-size: 11px;
      color: #94A3B8;
      display: block;
      margin-bottom: 6px;
    }

    .copy-row {
      display: flex;
      gap: 8px;
    }

    .copy-input {
      font-size: 12px;
      color: #38BDF8;
    }

    .btn-copy {
      background: #1E293B;
      border: 1px solid #334155;
      color: #FFFFFF;
      padding: 0 14px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
    }

    .link-hint {
      display: block;
      margin-top: 6px;
      font-size: 11px;
      color: #64748B;
    }

    .btn-block {
      width: 100%;
      margin-top: 10px;
    }
  `]
})
export class RequestCertificationModalComponent {
  @Input() athleteId!: string;
  @Input() athleteName!: string;
  @Output() closed = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private certService = inject(CertificationService);

  selectedType: BadgeType = 'MEDICAL_ANTHRO';
  selectedMethod: 'TOKEN_LINK' | 'DOCUMENT_UPLOAD' = 'TOKEN_LINK';
  isSubmitting = false;
  errorMessage = '';
  successResponse = false;
  successMessage = '';
  generatedLink = '';

  requestForm: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(150)]],
    description: [''],
    targetName: ['', [Validators.required, Validators.maxLength(150)]],
    targetEmail: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    targetOrganization: [''],
    evidenceDocumentUrl: ['']
  });

  selectType(type: BadgeType): void {
    this.selectedType = type;
    if (!this.requestForm.get('title')?.value) {
      if (type === 'MEDICAL_ANTHRO') {
        this.requestForm.patchValue({ title: 'Evaluación Médica y Antropométrica 2026' });
      } else if (type === 'SPORT_ACHIEVEMENT') {
        this.requestForm.patchValue({ title: 'Logro o Título en Torneo Oficial' });
      } else if (type === 'FEDERATION_LICENSE') {
        this.requestForm.patchValue({ title: 'Ficha Federativa Oficial' });
      } else if (type === 'CLUB_AFFILIATION') {
        this.requestForm.patchValue({ title: 'Afiliación Activa al Club' });
      }
    }
  }

  selectMethod(method: 'TOKEN_LINK' | 'DOCUMENT_UPLOAD'): void {
    this.selectedMethod = method;
    if (method === 'TOKEN_LINK') {
      this.requestForm.get('targetName')?.setValidators([Validators.required, Validators.maxLength(150)]);
      this.requestForm.get('targetEmail')?.setValidators([Validators.required, Validators.email, Validators.maxLength(150)]);
      this.requestForm.get('evidenceDocumentUrl')?.clearValidators();
    } else {
      this.requestForm.get('targetName')?.clearValidators();
      this.requestForm.get('targetEmail')?.clearValidators();
      this.requestForm.get('evidenceDocumentUrl')?.setValidators([Validators.required]);
    }
    this.requestForm.get('targetName')?.updateValueAndValidity();
    this.requestForm.get('targetEmail')?.updateValueAndValidity();
    this.requestForm.get('evidenceDocumentUrl')?.updateValueAndValidity();
  }

  getTitlePlaceholder(): string {
    switch (this.selectedType) {
      case 'MEDICAL_ANTHRO':
        return 'Ej. Control Antropométrico Oficial Semestre I';
      case 'SPORT_ACHIEVEMENT':
        return 'Ej. Campeón Distrital Sub-15 / Máximo Goleador (18 Goles)';
      case 'FEDERATION_LICENSE':
        return 'Ej. Licencia Federada FVF Categoría 2010';
      case 'CLUB_AFFILIATION':
        return 'Ej. Ficha de Jugador Oficial de Caracas FC';
      default:
        return 'Título de la certificación';
    }
  }

  onSubmit(): void {
    if (this.requestForm.invalid || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const val = this.requestForm.value;

    if (this.selectedMethod === 'TOKEN_LINK') {
      this.certService.requestCertificationWithToken({
        athleteId: this.athleteId,
        badgeType: this.selectedType,
        title: val.title,
        description: val.description,
        targetEmail: val.targetEmail,
        targetName: val.targetName,
        targetOrganization: val.targetOrganization
      }).subscribe({
        next: (res) => {
          this.isSubmitting = false;
          this.successResponse = true;
          this.generatedLink = res.certificationLink || '';
          this.successMessage = `Se ha generado el enlace seguro y enviado la invitación a ${res.targetEmail}. El certificador podrá validar los datos sin necesidad de registrarse.`;
          this.created.emit();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.errorMessage = err.error?.message || 'Error al generar la solicitud de certificación.';
        }
      });
    } else {
      this.certService.requestCertificationWithDocument({
        athleteId: this.athleteId,
        badgeType: this.selectedType,
        title: val.title,
        description: val.description,
        evidenceDocumentUrl: val.evidenceDocumentUrl
      }).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.successResponse = true;
          this.generatedLink = '';
          this.successMessage = 'El documento ha sido cargado exitosamente y enviado a la cola de auditoría de los Administradores de Talentus Scout.';
          this.created.emit();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.errorMessage = err.error?.message || 'Error al enviar el documento para revisión.';
        }
      });
    }
  }

  copyLink(): void {
    if (this.generatedLink && navigator.clipboard) {
      navigator.clipboard.writeText(this.generatedLink);
    }
  }

  closeModal(): void {
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeModal();
    }
  }
}
