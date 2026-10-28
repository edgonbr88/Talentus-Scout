import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEvent, HttpHeaders, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import {
  RequestUploadRequest,
  UploadTicketResponse,
  AthleteVideoResponse
} from '../models/video.model';

@Injectable({
  providedIn: 'root'
})
export class VideoUploadService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  /**
   * Solicita un ticket de carga al backend Spring Boot.
   * Retorna el ID asignado, la URL de subida directa y el tamaño máximo permitido.
   */
  requestUploadTicket(request: RequestUploadRequest): Observable<UploadTicketResponse> {
    return this.http.post<UploadTicketResponse>('/api/v1/videos/request-upload', request);
  }

  /**
   * Sube el archivo de video al endpoint de carga directa (Mock Local o Cloudflare Stream)
   * emitiendo eventos de progreso HTTP en tiempo real y adjuntando miniatura si existe.
   */
  uploadFileWithProgress(uploadUrl: string, file: File, thumbnailFile?: File | Blob): Observable<HttpEvent<any>> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    if (thumbnailFile) {
      const thumbName = thumbnailFile instanceof File ? thumbnailFile.name : 'thumbnail.jpg';
      formData.append('thumbnail', thumbnailFile, thumbName);
    }

    let headers = new HttpHeaders();
    const token = this.authService.token();
    // Adjuntar token solo para endpoints locales o de mismo origen; evitar enviarlo a Cloudflare u otros proveedores externos
    const isExternalUpload = uploadUrl.startsWith('http') &&
      !uploadUrl.includes('localhost') &&
      !uploadUrl.includes('127.0.0.1') &&
      !uploadUrl.includes('talentus-scout-be') &&
      !uploadUrl.includes('/api/v1/videos/mock-upload');

    if (token && !isExternalUpload) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    const req = new HttpRequest('POST', uploadUrl, formData, {
      headers,
      reportProgress: true
    });

    return this.http.request(req);
  }

  /**
   * Consulta los videos asociados a un atleta específico.
   */
  getVideosByAthlete(athleteId: string): Observable<AthleteVideoResponse[]> {
    return this.http.get<AthleteVideoResponse[]>(`/api/v1/athletes/${athleteId}/videos`);
  }

  /**
   * Extrae un fotograma del video en el navegador mediante HTML5 Video y Canvas API
   * para generar una miniatura instantánea en cliente antes de iniciar la subida.
   */
  generateLocalThumbnail(file: File, timeInSeconds = 1): Promise<string> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        resolve('');
        return;
      }

      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      const fileUrl = URL.createObjectURL(file);
      video.src = fileUrl;

      const cleanUp = () => {
        URL.revokeObjectURL(fileUrl);
        video.removeAttribute('src');
        video.load();
      };

      video.onloadedmetadata = () => {
        const seekTime = Math.min(timeInSeconds, video.duration > 0 ? video.duration / 2 : 0.5);
        video.currentTime = seekTime;
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          const width = video.videoWidth || 640;
          const height = video.videoHeight || 360;
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            cleanUp();
            resolve(dataUrl);
          } else {
            cleanUp();
            resolve('');
          }
        } catch (err) {
          cleanUp();
          resolve('');
        }
      };

      video.onerror = () => {
        cleanUp();
        resolve('');
      };
    });
  }

  /**
   * Convierte un DataURL (base64) generado por Canvas en un objeto File de tipo imagen
   * para adjuntarlo como multipart en el reporte de subida.
   */
  dataUrlToFile(dataUrl: string, filename = 'thumbnail.jpg'): File | null {
    if (!dataUrl || !dataUrl.startsWith('data:image')) {
      return null;
    }
    try {
      const arr = dataUrl.split(',');
      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new File([u8arr], filename, { type: mime });
    } catch {
      return null;
    }
  }
}
