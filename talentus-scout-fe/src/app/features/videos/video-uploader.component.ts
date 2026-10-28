import { Component, EventEmitter, Input, Output, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpEventType, HttpResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { VideoUploadService } from '../../core/services/video-upload.service';
import {
  AthleteVideoResponse,
  UploadProgressState,
  VideoCategory
} from '../../core/models/video.model';

const MAX_FILE_SIZE_BYTES = 524288000; // 500 MB
const ALLOWED_MIME_TYPES = ['video/mp4', 'video/quicktime'];
const ALLOWED_EXTENSIONS = ['.mp4', '.mov'];

@Component({
  selector: 'app-video-uploader',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './video-uploader.component.html',
  styles: [`
    .video-uploader-card {
      background-color: #1E293B;
      border: 1px solid #334155;
      border-radius: var(--radius-md, 12px);
      padding: 24px;
      color: #F8FAFC;
      font-family: inherit;
      position: relative;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .video-uploader-card.is-dragging {
      border-color: #10B981;
      box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3);
    }

    .uploader-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 20px;
    }

    .header-badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #10B981;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.25);
      padding: 3px 8px;
      border-radius: 4px;
      margin-bottom: 8px;
    }

    .uploader-title {
      font-size: 20px;
      font-weight: 700;
      color: #F8FAFC;
      margin: 0 0 6px;
    }

    .uploader-subtitle {
      font-size: 13px;
      color: #94A3B8;
      line-height: 1.5;
      margin: 0;
      max-width: 60ch;
    }

    .btn-close {
      background: none;
      border: 1px solid #334155;
      color: #94A3B8;
      width: 32px;
      height: 32px;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      transition: all 0.15s ease;
    }

    .btn-close:hover {
      background: #334155;
      color: #F8FAFC;
    }

    /* DROP-ZONE ESTILOS */
    .drop-zone {
      border: 2px dashed #475569;
      background-color: #0F172A;
      border-radius: var(--radius-sm, 8px);
      padding: 44px 20px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s ease;
      outline: none;
    }

    .drop-zone:hover,
    .drop-zone:focus-visible {
      border-color: #10B981;
      background-color: #111E38;
    }

    .hidden-input {
      display: none;
    }

    .drop-icon-wrapper {
      width: 56px;
      height: 56px;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.2);
      color: #10B981;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
    }

    .drop-icon {
      width: 28px;
      height: 28px;
    }

    .drop-texts {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 20px;
    }

    .drop-action-text {
      font-size: 15px;
      font-weight: 600;
      color: #F8FAFC;
    }

    .drop-specs-text {
      font-size: 12px;
      color: #94A3B8;
    }

    .drop-badges-row {
      display: flex;
      justify-content: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .spec-pill {
      font-size: 11px;
      color: #CBD5E1;
      background: #1E293B;
      padding: 4px 10px;
      border-radius: 9999px;
      border: 1px solid #334155;
    }

    /* PREVIEW & METADATA ESTILOS */
    .selected-state-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .preview-layout {
      display: flex;
      gap: 16px;
      background: #0F172A;
      padding: 14px;
      border-radius: var(--radius-sm, 8px);
      border: 1px solid #334155;
      align-items: center;
    }

    .thumbnail-wrapper {
      position: relative;
      width: 140px;
      height: 80px;
      border-radius: 6px;
      overflow: hidden;
      background: #000;
      flex-shrink: 0;
      border: 1px solid #334155;
    }

    .thumbnail-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .thumbnail-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      color: #64748B;
      text-align: center;
      padding: 8px;
    }

    .duration-badge {
      position: absolute;
      bottom: 4px;
      right: 4px;
      background: rgba(0, 0, 0, 0.75);
      color: #F8FAFC;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: 600;
    }

    .file-summary {
      flex: 1;
      min-width: 0;
    }

    .file-name {
      font-size: 14px;
      font-weight: 600;
      color: #F8FAFC;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: 4px;
    }

    .file-meta {
      font-size: 12px;
      color: #94A3B8;
      display: flex;
      gap: 6px;
      margin-bottom: 8px;
    }

    .btn-text-action {
      background: none;
      border: none;
      color: #38BDF8;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      padding: 0;
      text-decoration: underline;
    }

    .btn-text-action:hover {
      color: #7DD3FC;
    }

    /* FORMULARIO */
    .metadata-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-group {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-label {
      font-size: 13px;
      font-weight: 600;
      color: #CBD5E1;
    }

    .required {
      color: #EF4444;
    }

    .form-input {
      background-color: #0F172A;
      border: 1px solid #334155;
      border-radius: 6px;
      padding: 10px 14px;
      font-size: 14px;
      color: #F8FAFC;
      outline: none;
      transition: border-color 0.15s ease;
    }

    .form-input:focus {
      border-color: #10B981;
    }

    .input-counter {
      font-size: 11px;
      color: #64748B;
      align-self: flex-end;
      margin-top: 2px;
    }

    .category-chips {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .category-chip {
      background: #0F172A;
      border: 1px solid #334155;
      color: #CBD5E1;
      padding: 8px 14px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }

    .category-chip:hover {
      background: #1E293B;
      border-color: #475569;
    }

    .category-chip.is-active {
      background: rgba(16, 185, 129, 0.15);
      border-color: #10B981;
      color: #10B981;
      font-weight: 600;
    }

    .chip-icon {
      font-size: 14px;
    }

    /* FOOTER DE BOTONES */
    .action-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding-top: 12px;
      border-top: 1px solid #334155;
    }

    .btn {
      padding: 10px 18px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: none;
      transition: all 0.15s ease;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-primary {
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
      color: #FFFFFF;
    }

    .btn-primary:hover:not(:disabled) {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
    }

    .btn-secondary {
      background: #0F172A;
      color: #CBD5E1;
      border: 1px solid #334155;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #1E293B;
      color: #F8FAFC;
    }

    .btn-secondary-danger {
      background: rgba(239, 68, 68, 0.1);
      color: #EF4444;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .btn-secondary-danger:hover {
      background: rgba(239, 68, 68, 0.2);
    }

    .btn-icon {
      width: 16px;
      height: 16px;
    }

    /* ESTADO UPLOADING */
    .uploading-state-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 10px 0;
    }

    .upload-headline {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .pulse-indicator {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #10B981;
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
      animation: pulse 1.6s infinite;
    }

    .pulse-indicator.is-processing {
      background: #F59E0B;
      box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7);
    }

    @keyframes pulse {
      0% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
      }
      70% {
        transform: scale(1);
        box-shadow: 0 0 0 8px rgba(16, 185, 129, 0);
      }
      100% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
      }
    }

    .upload-stage-label {
      font-size: 14px;
      font-weight: 600;
      color: #F8FAFC;
    }

    .progress-track {
      background-color: #0F172A;
      height: 10px;
      border-radius: 9999px;
      overflow: hidden;
      border: 1px solid #334155;
      position: relative;
    }

    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #059669 0%, #10B981 100%);
      border-radius: 9999px;
      transition: width 0.25s ease-out;
      position: relative;
    }

    .progress-glow {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      width: 20px;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6));
    }

    .progress-metrics-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      color: #CBD5E1;
    }

    .percentage-metric {
      font-weight: 700;
      color: #10B981;
    }

    .speed-tag {
      color: #94A3B8;
      margin-left: 4px;
    }

    .uploader-warning-notice {
      font-size: 12px;
      color: #64748B;
      font-style: italic;
    }

    .cancel-upload-wrapper {
      display: flex;
      justify-content: flex-end;
    }

    /* ESTADO READY */
    .ready-state-container {
      text-align: center;
      padding: 10px 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .success-icon-badge {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: rgba(16, 185, 129, 0.15);
      border: 2px solid #10B981;
      color: #10B981;
      font-size: 24px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .success-title {
      font-size: 18px;
      font-weight: 700;
      color: #F8FAFC;
      margin: 0;
    }

    .success-description {
      font-size: 13px;
      color: #94A3B8;
      max-width: 50ch;
      margin: 0;
    }

    .ready-preview-card {
      display: flex;
      align-items: center;
      gap: 14px;
      background: #0F172A;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 10px 14px;
      width: 100%;
      max-width: 420px;
      text-align: left;
    }

    .ready-thumb-box {
      width: 80px;
      height: 48px;
      border-radius: 4px;
      overflow: hidden;
      background: #000;
      flex-shrink: 0;
    }

    .ready-thumb-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .ready-info {
      flex: 1;
      min-width: 0;
    }

    .ready-category-badge {
      font-size: 10px;
      color: #10B981;
      font-weight: 700;
      display: block;
      margin-bottom: 2px;
    }

    .ready-video-title {
      font-size: 13px;
      font-weight: 600;
      color: #F8FAFC;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .ready-status-pill {
      font-size: 10px;
      color: #CBD5E1;
    }

    .ready-actions-row {
      display: flex;
      gap: 12px;
      margin-top: 10px;
    }

    /* ESTADO ERROR */
    .error-state-container {
      text-align: center;
      padding: 10px 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .error-icon-badge {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: rgba(239, 68, 68, 0.15);
      border: 2px solid #EF4444;
      color: #EF4444;
      font-size: 24px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .error-title {
      font-size: 18px;
      font-weight: 700;
      color: #F8FAFC;
      margin: 0;
    }

    .error-message {
      font-size: 13px;
      color: #F87171;
      max-width: 50ch;
      margin: 0;
    }

    .error-actions-row {
      display: flex;
      gap: 12px;
      margin-top: 10px;
    }
  `]
})
export class VideoUploaderComponent implements OnDestroy {
  @Input({ required: true }) athleteId!: string;
  @Input() athleteName?: string;

  @Output() videoUploaded = new EventEmitter<AthleteVideoResponse>();
  @Output() cancelled = new EventEmitter<void>();

  private videoService = inject(VideoUploadService);
  private uploadSubscription?: Subscription;

  selectedFile: File | null = null;
  localThumbnailUrl: string | null = null;
  videoTitle = '';
  videoCategory: VideoCategory = 'HIGHLIGHTS';
  isDragging = false;
  lastUploadedVideo: AthleteVideoResponse | null = null;

  progressState: UploadProgressState = {
    status: 'idle',
    percentage: 0,
    loadedBytes: 0,
    totalBytes: 0,
    speedMbps: 0
  };

  readonly categoryOptions: { value: VideoCategory; label: string; icon: string }[] = [
    { value: 'HIGHLIGHTS', label: 'Jugadas Destacadas', icon: '⚡' },
    { value: 'GOLES', label: 'Goles', icon: '⚽' },
    { value: 'ASISTENCIAS', label: 'Asistencias', icon: '🎯' },
    { value: 'DEFENSA', label: 'Defensa y Bloqueos', icon: '🛡️' },
    { value: 'PARTIDO_COMPLETO', label: 'Partido Completo', icon: '⏱️' }
  ];

  private uploadStartTime = 0;
  private lastLoadedBytes = 0;
  private lastTimeSnapshot = 0;

  ngOnDestroy(): void {
    this.cancelCurrentUpload();
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      this.handleFile(event.dataTransfer.files[0]);
    }
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  handleFile(file: File): void {
    // 1. Validar formato
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    const isValidExtension = ALLOWED_EXTENSIONS.includes(extension);
    const isValidMime = ALLOWED_MIME_TYPES.includes(file.type);

    if (!isValidExtension && !isValidMime) {
      this.setError('Formato no compatible. Por favor sube un archivo de video en formato MP4 o MOV.');
      return;
    }

    // 2. Validar tamaño máximo (500 MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      this.setError(`El archivo supera el límite de 500 MB (tamaño actual: ${this.formatBytes(file.size)}).`);
      return;
    }

    this.selectedFile = file;
    this.progressState = {
      status: 'selected',
      percentage: 0,
      loadedBytes: 0,
      totalBytes: file.size,
      speedMbps: 0
    };

    // Sugerir título predeterminado a partir del nombre del archivo si está vacío
    if (!this.videoTitle.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      this.videoTitle = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
    }

    // Generar miniatura en el navegador
    this.videoService.generateLocalThumbnail(file).then((thumbUrl) => {
      this.localThumbnailUrl = thumbUrl;
    });
  }

  startUpload(): void {
    if (!this.selectedFile || !this.athleteId || !this.videoTitle.trim()) {
      return;
    }

    this.progressState.status = 'requesting_ticket';
    this.progressState.percentage = 0;
    this.uploadStartTime = Date.now();
    this.lastTimeSnapshot = this.uploadStartTime;
    this.lastLoadedBytes = 0;

    // 1. Solicitar ticket de subida al backend
    this.videoService.requestUploadTicket({
      athleteId: this.athleteId,
      title: this.videoTitle.trim(),
      category: this.videoCategory
    }).subscribe({
      next: (ticket) => {
        this.executeBinaryUpload(ticket.directUploadUrl, this.selectedFile!);
      },
      error: (err) => {
        let msg = err.error?.message;
        if (!msg) {
          if (err.status === 403) {
            msg = 'El atleta no cuenta con una suscripción Pro activa para subir videos.';
          } else {
            msg = 'Error al autorizar la carga del video. Verifica la sesión e intenta nuevamente.';
          }
        }
        this.setError(msg);
      }
    });
  }

  private executeBinaryUpload(uploadUrl: string, file: File): void {
    this.progressState.status = 'uploading';

    const thumbnailFile = this.localThumbnailUrl
      ? this.videoService.dataUrlToFile(this.localThumbnailUrl, `${this.athleteId}_thumb.jpg`)
      : undefined;

    this.uploadSubscription = this.videoService.uploadFileWithProgress(uploadUrl, file, thumbnailFile || undefined).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress) {
          const total = event.total || file.size;
          const loaded = event.loaded;
          const pct = Math.min(100, Math.round((100 * loaded) / total));

          // Calcular velocidad instantánea
          const now = Date.now();
          const elapsedSec = (now - this.lastTimeSnapshot) / 1000;
          if (elapsedSec >= 0.5) {
            const bytesDelta = loaded - this.lastLoadedBytes;
            const mbDelta = bytesDelta / (1024 * 1024);
            this.progressState.speedMbps = Math.max(0, mbDelta / elapsedSec);
            this.lastTimeSnapshot = now;
            this.lastLoadedBytes = loaded;
          }

          this.progressState.percentage = pct;
          this.progressState.loadedBytes = loaded;
          this.progressState.totalBytes = total;

          if (pct >= 100) {
            this.progressState.status = 'processing';
          }
        } else if (event instanceof HttpResponse) {
          this.progressState.status = 'ready';
          this.progressState.percentage = 100;
          const videoRes = event.body as AthleteVideoResponse;
          this.lastUploadedVideo = videoRes;
          this.videoUploaded.emit(videoRes);
        }
      },
      error: (err) => {
        const msg = err.error?.message || 'Error durante la transferencia del archivo. Comprueba tu conexión a internet.';
        this.setError(msg);
      }
    });
  }

  cancelCurrentUpload(): void {
    if (this.uploadSubscription) {
      this.uploadSubscription.unsubscribe();
      this.uploadSubscription = undefined;
    }
    this.progressState.status = 'selected';
    this.progressState.percentage = 0;
  }

  retryUpload(): void {
    if (this.selectedFile) {
      this.startUpload();
    } else {
      this.resetAll();
    }
  }

  resetSelection(): void {
    this.cancelCurrentUpload();
    this.selectedFile = null;
    this.localThumbnailUrl = null;
    this.progressState = {
      status: 'idle',
      percentage: 0,
      loadedBytes: 0,
      totalBytes: 0,
      speedMbps: 0
    };
  }

  resetAll(): void {
    this.resetSelection();
    this.videoTitle = '';
    this.videoCategory = 'HIGHLIGHTS';
    this.lastUploadedVideo = null;
  }

  onComplete(): void {
    this.cancelled.emit();
  }

  onCancel(): void {
    this.cancelCurrentUpload();
    this.cancelled.emit();
  }

  private setError(message: string): void {
    this.progressState.status = 'error';
    this.progressState.errorMessage = message;
  }

  formatBytes(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
