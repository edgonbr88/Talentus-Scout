import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AdminHeaderComponent } from '../../../shared/components/admin-header/admin-header.component';
import { AdminLegalVerificationService } from '../../../core/services/admin-legal-verification.service';
import {
  LegalVerificationItem,
  LegalVerificationStatus,
  VerificationMetrics
} from '../../../core/models/admin-legal-verification.model';

@Component({
  selector: 'app-admin-legal-verification',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AdminHeaderComponent],
  templateUrl: './admin-legal-verification.component.html',
  styleUrls: ['./admin-legal-verification.component.css']
})
export class AdminLegalVerificationComponent implements OnInit {
  private legalService = inject(AdminLegalVerificationService);
  private sanitizer = inject(DomSanitizer);

  // Estados de datos
  items = signal<LegalVerificationItem[]>([]);
  metrics = signal<VerificationMetrics>({ pendingCount: 0, approvedCount: 0, rejectedCount: 0 });
  isLoading = signal<boolean>(false);
  isProcessingReview = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Paginación y Filtros
  currentPage = signal<number>(0);
  totalPages = signal<number>(0);
  totalElements = signal<number>(0);
  searchTerm = signal<string>('');

  // Modal Split-View de Inspección
  selectedItem = signal<LegalVerificationItem | null>(null);
  isModalOpen = signal<boolean>(false);
  showRejectForm = signal<boolean>(false);
  rejectionNotes = signal<string>('');

  // Visor de documentos: niveles de zoom
  tutorZoom = signal<number>(1);
  athleteZoom = signal<number>(1);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.legalService.getVerificationMetrics().subscribe({
      next: (m) => this.metrics.set(m),
      error: (err) => console.warn('Error al cargar métricas:', err)
    });

    this.legalService.getPendingVerifications(this.currentPage(), 15).subscribe({
      next: (page) => {
        this.items.set(page.content);
        this.totalPages.set(page.totalPages);
        this.totalElements.set(page.totalElements);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Error al cargar las solicitudes de verificación legal.');
        this.isLoading.set(false);
      }
    });
  }

  get filteredItems(): LegalVerificationItem[] {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) {
      return this.items();
    }
    return this.items().filter(item =>
      (item.athleteFullName && item.athleteFullName.toLowerCase().includes(term)) ||
      (item.tutorFullName && item.tutorFullName.toLowerCase().includes(term)) ||
      (item.tutorEmail && item.tutorEmail.toLowerCase().includes(term)) ||
      (item.athleteDocNumber && item.athleteDocNumber.toLowerCase().includes(term))
    );
  }

  openInspectionModal(item: LegalVerificationItem): void {
    this.selectedItem.set(item);
    this.showRejectForm.set(false);
    this.rejectionNotes.set('');
    this.tutorZoom.set(1);
    this.athleteZoom.set(1);
    this.isModalOpen.set(true);
  }

  closeInspectionModal(): void {
    this.isModalOpen.set(false);
    this.selectedItem.set(null);
    this.showRejectForm.set(false);
    this.rejectionNotes.set('');
  }

  zoomTutor(delta: number): void {
    const next = Math.min(Math.max(this.tutorZoom() + delta, 0.6), 2.5);
    this.tutorZoom.set(Math.round(next * 10) / 10);
  }

  zoomAthlete(delta: number): void {
    const next = Math.min(Math.max(this.athleteZoom() + delta, 0.6), 2.5);
    this.athleteZoom.set(Math.round(next * 10) / 10);
  }

  approveVerification(): void {
    const item = this.selectedItem();
    if (!item || this.isProcessingReview()) return;

    if (!confirm(`¿Confirmas la aprobación de la patria potestad y representación legal para el atleta ${item.athleteFullName}?`)) {
      return;
    }

    this.isProcessingReview.set(true);
    this.legalService.reviewVerification(item.athleteId, {
      decision: 'APPROVED',
      notes: 'Filiación y patria potestad cotejada con éxito por el equipo de auditoría legal.'
    }).subscribe({
      next: (res) => {
        this.successMessage.set(`¡Patria potestad para ${item.athleteFullName} aprobada exitosamente! Se notificó al tutor.`);
        this.isProcessingReview.set(false);
        this.closeInspectionModal();
        this.loadData();
        setTimeout(() => this.successMessage.set(null), 5000);
      },
      error: (err) => {
        alert(err.error?.message || 'Error al aprobar la verificación.');
        this.isProcessingReview.set(false);
      }
    });
  }

  toggleRejectForm(): void {
    this.showRejectForm.set(!this.showRejectForm());
  }

  submitRejection(): void {
    const item = this.selectedItem();
    const notes = this.rejectionNotes().trim();
    if (!item || this.isProcessingReview()) return;

    if (!notes) {
      alert('Debes indicar obligatoriamente el motivo de la observación o rechazo para que el tutor pueda corregirlo.');
      return;
    }

    this.isProcessingReview.set(true);
    this.legalService.reviewVerification(item.athleteId, {
      decision: 'REJECTED',
      notes: notes
    }).subscribe({
      next: (res) => {
        this.successMessage.set(`Solicitud para ${item.athleteFullName} observada. Se notificó al representante con las indicaciones.`);
        this.isProcessingReview.set(false);
        this.closeInspectionModal();
        this.loadData();
        setTimeout(() => this.successMessage.set(null), 5000);
      },
      error: (err) => {
        alert(err.error?.message || 'Error al rechazar la solicitud.');
        this.isProcessingReview.set(false);
      }
    });
  }

  isPdf(url?: string): boolean {
    if (!url) return false;
    return url.toLowerCase().includes('.pdf');
  }

  getSafeUrl(url?: string): SafeResourceUrl {
    if (!url) return '';
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
