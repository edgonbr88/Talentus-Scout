import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';

export type CaptureMode = 'idle' | 'camera-live' | 'captured' | 'file-uploaded';

@Component({
  selector: 'app-webcam-selfie-capture',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './webcam-selfie-capture.component.html',
  styleUrls: ['./webcam-selfie-capture.component.css']
})
export class WebcamSelfieCaptureComponent implements OnDestroy {
  @Input() label: string = 'Fotografía Selfie en Vivo';
  @Input() helperText: string = 'Toma una fotografía selfie nítida sosteniendo tu documento de identidad legible junto a tu rostro.';
  @Input() required: boolean = true;
  @Input() existingImageUrl: string | null = null;

  @Output() photoSelected = new EventEmitter<File>();
  @Output() photoCleared = new EventEmitter<void>();

  @ViewChild('videoElement') videoElement?: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement?: ElementRef<HTMLCanvasElement>;
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  mode: CaptureMode = 'idle';
  previewUrl: string | null = null;
  errorMessage: string | null = null;
  isStartingCamera = false;
  isDragOver = false;

  private mediaStream: MediaStream | null = null;

  async startCamera(): Promise<void> {
    this.errorMessage = null;
    this.isStartingCamera = true;

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Tu navegador o dispositivo no soporta captura de video directa. Por favor sube una foto en su lugar.');
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      this.mode = 'camera-live';
      this.isStartingCamera = false;

      // Esperar al siguiente ciclo para vincular el stream al elemento de video
      setTimeout(() => {
        if (this.videoElement?.nativeElement && this.mediaStream) {
          this.videoElement.nativeElement.srcObject = this.mediaStream;
          this.videoElement.nativeElement.play().catch(err => {
            console.warn('Error al iniciar reproducción de video:', err);
          });
        }
      }, 50);

    } catch (err: any) {
      this.isStartingCamera = false;
      this.mode = 'idle';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        this.errorMessage = 'Permiso denegado para acceder a la cámara. Puedes conceder el permiso o subir una foto usando el botón de archivo.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        this.errorMessage = 'No se detectó ninguna cámara en este dispositivo. Puedes subir una foto de archivo.';
      } else {
        this.errorMessage = err.message || 'No fue posible iniciar la cámara web.';
      }
    }
  }

  capturePhoto(): void {
    if (!this.videoElement?.nativeElement || !this.mediaStream) {
      return;
    }

    const video = this.videoElement.nativeElement;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      this.errorMessage = 'Error al procesar la captura de imagen.';
      return;
    }

    // Dibujar el fotograma actual
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) {
        this.errorMessage = 'No se pudo generar el archivo de imagen.';
        return;
      }

      const file = new File([blob], `selfie_${Date.now()}.jpg`, { type: 'image/jpeg' });
      this.previewUrl = URL.createObjectURL(blob);
      this.mode = 'captured';
      this.stopCameraStream();
      this.photoSelected.emit(file);
    }, 'image/jpeg', 0.92);
  }

  stopCameraStream(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
  }

  retakePhoto(): void {
    this.previewUrl = null;
    this.photoCleared.emit();
    this.startCamera();
  }

  triggerFileInput(): void {
    this.fileInput?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.processFile(input.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
      this.processFile(event.dataTransfer.files[0]);
    }
  }

  private processFile(file: File): void {
    this.errorMessage = null;

    if (!file.type.startsWith('image/')) {
      this.errorMessage = 'Formato inválido. Por favor selecciona una imagen válida (JPG, PNG o WEBP).';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      this.errorMessage = 'La imagen excede el tamaño máximo permitido de 10 MB.';
      return;
    }

    this.stopCameraStream();
    this.previewUrl = URL.createObjectURL(file);
    this.mode = 'file-uploaded';
    this.photoSelected.emit(file);
  }

  cancelCapture(): void {
    this.stopCameraStream();
    this.mode = 'idle';
  }

  clearPhoto(): void {
    this.stopCameraStream();
    this.previewUrl = null;
    this.mode = 'idle';
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
    this.photoCleared.emit();
  }

  ngOnDestroy(): void {
    this.stopCameraStream();
  }
}
