import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Resuelve una URL de activo multimedia (foto de perfil, video, documento).
 * - Si es absoluta (http://, https://, data:, blob:), la retorna tal cual.
 * - Si es relativa (/uploads/...), antepone environment.backendOrigin si está definido
 *   (ej. http://localhost:8080/uploads/... en desarrollo local fuera de proxy).
 */
export function resolveAssetUrl(url?: string | null): string {
  if (!url || !url.trim()) {
    return '';
  }

  const cleanUrl = url.trim();

  if (
    cleanUrl.startsWith('http://') ||
    cleanUrl.startsWith('https://') ||
    cleanUrl.startsWith('data:') ||
    cleanUrl.startsWith('blob:')
  ) {
    return cleanUrl;
  }

  if (cleanUrl.startsWith('/uploads/')) {
    const origin = (environment as { backendOrigin?: string }).backendOrigin || '';
    if (origin) {
      const cleanOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
      return `${cleanOrigin}${cleanUrl}`;
    }
  }

  return cleanUrl;
}

@Pipe({
  name: 'mediaUrl',
  standalone: true
})
export class MediaUrlPipe implements PipeTransform {
  transform(url?: string | null): string {
    return resolveAssetUrl(url);
  }
}
