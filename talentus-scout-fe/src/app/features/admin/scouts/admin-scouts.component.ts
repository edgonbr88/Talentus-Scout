import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminHeaderComponent } from '../../../shared/components/admin-header/admin-header.component';
import { AdminScoutService } from '../../../core/services/admin-scout.service';
import { PendingScout } from '../../../core/models/admin-scout.model';

@Component({
  selector: 'app-admin-scouts',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AdminHeaderComponent],
  templateUrl: './admin-scouts.component.html',
  styleUrls: ['./admin-scouts.component.css']
})
export class AdminScoutsComponent implements OnInit {
  private adminScoutService = inject(AdminScoutService);

  // Estados Reactivos con Signals
  readonly pendingScouts = signal<PendingScout[]>([]);
  readonly totalPending = signal<number>(0);
  readonly isLoading = signal<boolean>(true);
  readonly isProcessing = signal<boolean>(false);
  readonly processingId = signal<string | null>(null);

  // Notificaciones y Toasts
  readonly feedback = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estado del Modal de Rechazo Motivado
  readonly isRejectModalOpen = signal<boolean>(false);
  readonly scoutToReject = signal<PendingScout | null>(null);
  rejectionReasonInput = '';
  readonly rejectionError = signal<string | null>(null);

  ngOnInit(): void {
    this.loadPendingScouts();
  }

  loadPendingScouts(): void {
    this.isLoading.set(true);
    this.adminScoutService.getPendingScouts(0, 50).subscribe({
      next: (page) => {
        this.pendingScouts.set(page.content);
        this.totalPending.set(page.totalElements);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.showFeedback('error', 'Error al cargar la cola de scouts pendientes: ' + (err.error?.message || err.message));
      }
    });
  }

  approveScout(scout: PendingScout): void {
    if (this.isProcessing()) return;

    this.isProcessing.set(true);
    this.processingId.set(scout.scoutProfileId);

    this.adminScoutService.reviewScout(scout.scoutProfileId, { decision: 'APPROVE' }).subscribe({
      next: (res) => {
        this.pendingScouts.update((list) => list.filter((s) => s.scoutProfileId !== scout.scoutProfileId));
        this.totalPending.update((total) => Math.max(0, total - 1));
        this.isProcessing.set(false);
        this.processingId.set(null);
        this.showFeedback('success', `✓ Acreditación aprobada para ${scout.fullName}. El usuario está activo para buscar talentos.`);
      },
      error: (err) => {
        this.isProcessing.set(false);
        this.processingId.set(null);
        this.showFeedback('error', 'Error al aprobar reclutador: ' + (err.error?.message || err.message));
      }
    });
  }

  openRejectModal(scout: PendingScout): void {
    this.scoutToReject.set(scout);
    this.rejectionReasonInput = '';
    this.rejectionError.set(null);
    this.isRejectModalOpen.set(true);
  }

  closeRejectModal(): void {
    this.isRejectModalOpen.set(false);
    this.scoutToReject.set(null);
    this.rejectionReasonInput = '';
    this.rejectionError.set(null);
  }

  confirmReject(): void {
    const reason = this.rejectionReasonInput.trim();
    if (!reason) {
      this.rejectionError.set('Por favor especifica un motivo detallado del rechazo para orientar al reclutador.');
      return;
    }

    const scout = this.scoutToReject();
    if (!scout) return;

    this.isProcessing.set(true);
    this.processingId.set(scout.scoutProfileId);

    this.adminScoutService.reviewScout(scout.scoutProfileId, {
      decision: 'REJECT',
      rejectionReason: reason
    }).subscribe({
      next: (res) => {
        this.pendingScouts.update((list) => list.filter((s) => s.scoutProfileId !== scout.scoutProfileId));
        this.totalPending.update((total) => Math.max(0, total - 1));
        this.isProcessing.set(false);
        this.processingId.set(null);
        this.closeRejectModal();
        this.showFeedback('success', `Solicitud de ${scout.fullName} rechazada. El motivo ha sido notificado y documentado.`);
      },
      error: (err) => {
        this.isProcessing.set(false);
        this.processingId.set(null);
        this.showFeedback('error', 'Error al rechazar solicitud: ' + (err.error?.message || err.message));
      }
    });
  }

  viewDocument(url: string): void {
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  private showFeedback(type: 'success' | 'error', text: string): void {
    this.feedback.set({ type, text });
    setTimeout(() => {
      if (this.feedback()?.text === text) {
        this.feedback.set(null);
      }
    }, 6000);
  }
}
