import { Component, inject, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { BrandLogoComponent } from '../../../shared/components/brand-logo/brand-logo.component';

const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

@Component({
  selector: 'app-scout-pending-audit',
  standalone: true,
  imports: [CommonModule, RouterLink, BrandLogoComponent],
  templateUrl: './scout-pending-audit.component.html',
  styleUrl: './scout-pending-audit.component.css'
})
export class ScoutPendingAuditComponent implements OnInit {
  private route = inject(ActivatedRoute);
  readonly authService = inject(AuthService);

  scoutEmail: string | null = null;
  organizationName: string | null = null;

  // Signals para remediación / re-subida
  readonly selectedFile = signal<File | null>(null);
  readonly fileError = signal<string | null>(null);
  readonly isUploading = signal<boolean>(false);
  readonly uploadSuccessMessage = signal<string | null>(null);
  readonly uploadErrorMessage = signal<string | null>(null);
  readonly isDragging = signal<boolean>(false);

  readonly currentUser = this.authService.currentUser;
  readonly isRejected = computed(() => this.currentUser()?.scoutVerificationStatus === 'REJECTED');
  readonly isApproved = computed(() => this.currentUser()?.scoutVerificationStatus === 'APPROVED' || this.authService.isVerifiedScout());
  readonly isPending = computed(() => !this.isRejected() && !this.isApproved());
  readonly rejectionReason = computed(() => this.currentUser()?.rejectionReason);

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.scoutEmail = params['email'] || null;
      this.organizationName = params['org'] || null;
    });

    if (this.authService.isAuthenticated()) {
      this.authService.fetchCurrentUser().subscribe({
        error: () => {}
      });
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.validateAndSetFile(input.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onFileDropped(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      this.validateAndSetFile(event.dataTransfer.files[0]);
    }
  }

  removeFile(): void {
    this.selectedFile.set(null);
    this.fileError.set(null);
  }

  private validateAndSetFile(file: File): void {
    this.fileError.set(null);
    this.uploadErrorMessage.set(null);

    const filename = file.name.toLowerCase();
    const hasValidExt = ALLOWED_EXTENSIONS.some(ext => filename.endsWith(ext));
    if (!hasValidExt) {
      this.fileError.set('Formato de archivo no soportado. Debe ser un archivo PDF, PNG o JPG.');
      this.selectedFile.set(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      this.fileError.set('El archivo excede el tamaño máximo permitido de 10 MB.');
      this.selectedFile.set(null);
      return;
    }

    this.selectedFile.set(file);
  }

  submitRemediation(): void {
    const file = this.selectedFile();
    if (!file) {
      this.fileError.set('Por favor selecciona una credencial o documento probatorio válido antes de reenviar.');
      return;
    }

    this.isUploading.set(true);
    this.uploadErrorMessage.set(null);
    this.uploadSuccessMessage.set(null);

    const formData = new FormData();
    formData.append('credentialsFile', file);

    this.authService.reUploadScoutCredentials(formData).subscribe({
      next: (res) => {
        this.isUploading.set(false);
        this.uploadSuccessMessage.set(res.message || 'Credenciales enviadas exitosamente. Tu perfil está nuevamente en revisión.');
        this.selectedFile.set(null);
        this.authService.fetchCurrentUser().subscribe();
      },
      error: (err) => {
        this.isUploading.set(false);
        this.uploadErrorMessage.set(err.error?.message || 'Error al enviar la credencial. Inténtalo de nuevo.');
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
