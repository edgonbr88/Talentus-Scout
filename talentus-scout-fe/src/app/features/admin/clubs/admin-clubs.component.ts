import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminClubService } from '../../../core/services/admin-club.service';
import {
  AdminClub,
  ClubStats,
  CreateClubPayload,
  UpdateClubPayload
} from '../../../core/models/admin-club.model';

@Component({
  selector: 'app-admin-clubs',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-clubs.component.html',
  styleUrls: ['./admin-clubs.component.css']
})
export class AdminClubsComponent implements OnInit {
  private adminClubService = inject(AdminClubService);

  // Estados Reactivos con Signals
  readonly clubs = signal<AdminClub[]>([]);
  readonly stats = signal<ClubStats>({
    totalClubs: 0,
    verifiedClubs: 0,
    pendingClubs: 0,
    totalAffiliatedAthletes: 0
  });

  readonly isLoading = signal<boolean>(true);
  readonly isProcessing = signal<boolean>(false);
  readonly processingId = signal<string | null>(null);

  // Filtros y Búsqueda
  searchQuery = '';
  readonly currentFilter = signal<'ALL' | 'VERIFIED' | 'PENDING_VERIFICATION'>('ALL');

  // Paginación
  currentPage = 0;
  readonly pageSize = 20;
  readonly totalElements = signal<number>(0);
  readonly totalPages = signal<number>(0);

  // Feedback y Notificaciones
  readonly feedback = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal Crear / Editar Club
  readonly isEditModalOpen = signal<boolean>(false);
  readonly editingClub = signal<AdminClub | null>(null);
  formName = '';
  formFederationCode = '';
  formCity = '';
  formState = '';
  formCountry = 'Venezuela';
  formLogoUrl = '';
  formVerifiedOfficial = false;
  selectedLogoFile: File | null = null;
  readonly logoPreview = signal<string | null>(null);
  readonly formError = signal<string | null>(null);

  // Modal Confirmación de Eliminación con Política de Integridad
  readonly isDeleteModalOpen = signal<boolean>(false);
  readonly clubToDelete = signal<AdminClub | null>(null);

  ngOnInit(): void {
    this.loadStats();
    this.loadClubs();
  }

  loadStats(): void {
    this.adminClubService.getStats().subscribe({
      next: (data) => this.stats.set(data),
      error: (err) => console.error('Error al cargar KPIs de clubes:', err)
    });
  }

  loadClubs(page = 0): void {
    this.isLoading.set(true);
    this.currentPage = page;

    this.adminClubService.getClubs(this.searchQuery, this.currentFilter(), this.currentPage, this.pageSize).subscribe({
      next: (pageData) => {
        this.clubs.set(pageData.content);
        this.totalElements.set(pageData.totalElements);
        this.totalPages.set(pageData.totalPages);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.showFeedback('error', 'Error al cargar los clubes: ' + (err.error?.message || err.message));
      }
    });
  }

  onSearchChange(): void {
    this.loadClubs(0);
  }

  setFilter(filter: 'ALL' | 'VERIFIED' | 'PENDING_VERIFICATION'): void {
    this.currentFilter.set(filter);
    this.loadClubs(0);
  }

  // Toggle de Verificación Oficial en 1 Clic
  toggleVerification(club: AdminClub): void {
    if (this.isProcessing()) return;

    this.isProcessing.set(true);
    this.processingId.set(club.id);

    const targetStatus = !club.verifiedOfficial;

    this.adminClubService.toggleVerification(club.id, targetStatus).subscribe({
      next: (updatedClub) => {
        this.clubs.update(list => list.map(c => c.id === updatedClub.id ? updatedClub : c));
        this.loadStats();
        this.isProcessing.set(false);
        this.processingId.set(null);
        this.showFeedback('success', `Club '${updatedClub.name}' ${updatedClub.verifiedOfficial ? 'verificado como oficial' : 'cambiado a pendiente'}.`);
      },
      error: (err) => {
        this.isProcessing.set(false);
        this.processingId.set(null);
        this.showFeedback('error', 'Error al alternar verificación: ' + (err.error?.message || err.message));
      }
    });
  }

  // Apertura de Modal Crear
  openCreateModal(): void {
    this.editingClub.set(null);
    this.formName = '';
    this.formFederationCode = '';
    this.formCity = '';
    this.formState = '';
    this.formCountry = 'Venezuela';
    this.formLogoUrl = '';
    this.formVerifiedOfficial = true; // Por defecto true al ser creado por admin
    this.selectedLogoFile = null;
    this.logoPreview.set(null);
    this.formError.set(null);
    this.isEditModalOpen.set(true);
  }

  // Apertura de Modal Editar
  openEditModal(club: AdminClub): void {
    this.editingClub.set(club);
    this.formName = club.name;
    this.formFederationCode = club.federationCode || '';
    this.formCity = club.city;
    this.formState = club.state;
    this.formCountry = club.country || 'Venezuela';
    this.formLogoUrl = club.logoUrl || '';
    this.formVerifiedOfficial = club.verifiedOfficial;
    this.selectedLogoFile = null;
    this.logoPreview.set(club.logoUrl || null);
    this.formError.set(null);
    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
    this.editingClub.set(null);
    this.selectedLogoFile = null;
  }

  onLogoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
      if (!validTypes.includes(file.type) && !file.name.endsWith('.svg')) {
        this.formError.set('Formato de escudo no válido. Permitidos: PNG, JPG, WEBP, SVG.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        this.formError.set('El archivo de imagen no puede exceder los 5MB.');
        return;
      }
      this.selectedLogoFile = file;
      this.formError.set(null);

      // Previsualización local
      const reader = new FileReader();
      reader.onload = () => this.logoPreview.set(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  saveClub(): void {
    if (!this.formName.trim()) {
      this.formError.set('El nombre del club u organización es obligatorio.');
      return;
    }
    if (!this.formCity.trim() || !this.formState.trim()) {
      this.formError.set('La ciudad y el estado son campos obligatorios.');
      return;
    }

    this.isProcessing.set(true);
    this.formError.set(null);

    const club = this.editingClub();

    if (club) {
      // Actualizar existente
      const payload: UpdateClubPayload = {
        name: this.formName.trim(),
        federationCode: this.formFederationCode.trim() || undefined,
        city: this.formCity.trim(),
        state: this.formState.trim(),
        country: this.formCountry.trim() || 'Venezuela',
        logoUrl: this.formLogoUrl.trim() || undefined,
        verifiedOfficial: this.formVerifiedOfficial
      };

      this.adminClubService.updateClub(club.id, payload).subscribe({
        next: (updated) => {
          if (this.selectedLogoFile) {
            this.uploadLogoAndFinalize(updated.id);
          } else {
            this.finishSave('Club actualizado exitosamente.');
          }
        },
        error: (err) => {
          this.isProcessing.set(false);
          this.formError.set(err.error?.message || 'Error al actualizar el club.');
        }
      });
    } else {
      // Crear nuevo
      const payload: CreateClubPayload = {
        name: this.formName.trim(),
        federationCode: this.formFederationCode.trim() || undefined,
        city: this.formCity.trim(),
        state: this.formState.trim(),
        country: this.formCountry.trim() || 'Venezuela',
        logoUrl: this.formLogoUrl.trim() || undefined,
        verifiedOfficial: this.formVerifiedOfficial
      };

      this.adminClubService.createClub(payload).subscribe({
        next: (created) => {
          if (this.selectedLogoFile) {
            this.uploadLogoAndFinalize(created.id);
          } else {
            this.finishSave('Club creado exitosamente.');
          }
        },
        error: (err) => {
          this.isProcessing.set(false);
          this.formError.set(err.error?.message || 'Error al registrar el club.');
        }
      });
    }
  }

  private uploadLogoAndFinalize(clubId: string): void {
    if (!this.selectedLogoFile) return;

    this.adminClubService.uploadLogo(clubId, this.selectedLogoFile).subscribe({
      next: () => {
        this.finishSave('Club guardado y escudo actualizado con éxito.');
      },
      error: (err) => {
        this.finishSave('Club guardado, pero ocurrió un detalle con el escudo: ' + (err.error?.message || err.message));
      }
    });
  }

  private finishSave(message: string): void {
    this.isProcessing.set(false);
    this.closeEditModal();
    this.loadClubs(this.currentPage);
    this.loadStats();
    this.showFeedback('success', message);
  }

  // Modal y Acción de Eliminación Segura
  openDeleteModal(club: AdminClub): void {
    this.clubToDelete.set(club);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.clubToDelete.set(null);
  }

  confirmDelete(): void {
    const club = this.clubToDelete();
    if (!club || this.isProcessing()) return;

    this.isProcessing.set(true);
    this.processingId.set(club.id);

    this.adminClubService.deleteClub(club.id).subscribe({
      next: () => {
        this.isProcessing.set(false);
        this.processingId.set(null);
        this.closeDeleteModal();
        this.loadClubs(this.currentPage);
        this.loadStats();
        this.showFeedback('success', `Club '${club.name}' eliminado. Los atletas asociados pasaron a independientes y los scouts fueron revocados a subsanación.`);
      },
      error: (err) => {
        this.isProcessing.set(false);
        this.processingId.set(null);
        this.showFeedback('error', 'Error al eliminar el club: ' + (err.error?.message || err.message));
      }
    });
  }

  showFeedback(type: 'success' | 'error', text: string): void {
    this.feedback.set({ type, text });
    setTimeout(() => {
      if (this.feedback()?.text === text) {
        this.feedback.set(null);
      }
    }, 6000);
  }

  getInitials(name: string): string {
    if (!name) return 'CL';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
}
