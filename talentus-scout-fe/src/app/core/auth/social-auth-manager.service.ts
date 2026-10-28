import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface OAuthConfig {
  googleClientId: string;
  microsoftClientId: string;
}

@Injectable({
  providedIn: 'root'
})
export class SocialAuthManagerService {
  private readonly GOOGLE_KEY = 'talentus_google_client_id';
  private readonly MICROSOFT_KEY = 'talentus_microsoft_client_id';
  private readonly PENDING_TOKEN_KEY = 'talentus_oauth_pending_token';
  private readonly PENDING_PROVIDER_KEY = 'talentus_oauth_pending_provider';

  getGoogleClientId(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(this.GOOGLE_KEY) || environment.googleClientId || '';
  }

  setGoogleClientId(id: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.GOOGLE_KEY, id.trim());
  }

  getMicrosoftClientId(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(this.MICROSOFT_KEY) || environment.microsoftClientId || '';
  }

  setMicrosoftClientId(id: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.MICROSOFT_KEY, id.trim());
  }

  hasGoogleClientId(): boolean {
    return !!this.getGoogleClientId();
  }

  hasMicrosoftClientId(): boolean {
    return !!this.getMicrosoftClientId();
  }

  /**
   * Verifica si la ventana actual fue abierta como popup de retorno OAuth2 (#id_token=... o ?code=...).
   * Retorna true si procesó un callback y cerró la ventana.
   */
  handleOAuthCallbackIfPresent(): boolean {
    if (typeof window === 'undefined') return false;

    const hash = window.location.hash ? window.location.hash.substring(1) : '';
    const search = window.location.search ? window.location.search.substring(1) : '';
    const params = new URLSearchParams(hash || search);

    const idToken = params.get('id_token') || params.get('access_token');
    if (!idToken) {
      return false;
    }

    // Almacena en localStorage para el fallback de captura por sondeo
    try {
      localStorage.setItem(this.PENDING_TOKEN_KEY, idToken);
      localStorage.setItem('talentus_oauth_token_time', Date.now().toString());
    } catch {
      // ignore
    }

    // Notifica a window.opener si está disponible
    if (window.opener) {
      try {
        window.opener.postMessage({
          type: 'TALENTUS_OAUTH_TOKEN',
          token: idToken
        }, window.location.origin);
      } catch (e) {
        console.warn('No se pudo enviar mensaje por postMessage a opener:', e);
      }
      try {
        window.close();
        return true;
      } catch {
        // ignore
      }
    }

    return true;
  }

  /**
   * Inicia el flujo oficial con Google OAuth2 mediante Popup.
   */
  loginWithGoogle(): Promise<string> {
    const clientId = this.getGoogleClientId();
    if (!clientId) {
      return Promise.reject(new Error('NO_CLIENT_ID_GOOGLE'));
    }

    const redirectUri = typeof window !== 'undefined'
      ? `${window.location.origin}/auth/login`
      : 'http://localhost/auth/login';

    const nonce = Math.random().toString(36).substring(2, 15);
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=id_token` +
      `&scope=${encodeURIComponent('openid email profile')}` +
      `&nonce=${encodeURIComponent(nonce)}` +
      `&prompt=select_account`;

    return this.openOAuthPopup(authUrl, 'google');
  }

  /**
   * Inicia el flujo oficial con Microsoft OAuth2 / OpenID Connect mediante Popup.
   */
  loginWithMicrosoft(): Promise<string> {
    const clientId = this.getMicrosoftClientId();
    if (!clientId) {
      return Promise.reject(new Error('NO_CLIENT_ID_MICROSOFT'));
    }

    const redirectUri = typeof window !== 'undefined'
      ? `${window.location.origin}/auth/login`
      : 'http://localhost/auth/login';

    const nonce = Math.random().toString(36).substring(2, 15);
    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=id_token` +
      `&scope=${encodeURIComponent('openid email profile')}` +
      `&response_mode=fragment` +
      `&nonce=${encodeURIComponent(nonce)}` +
      `&prompt=select_account`;

    return this.openOAuthPopup(authUrl, 'microsoft');
  }

  private openOAuthPopup(url: string, provider: 'google' | 'microsoft'): Promise<string> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('El entorno no soporta interfaz gráfica en navegador.'));
        return;
      }

      // Limpia tokens pendientes previos
      localStorage.removeItem(this.PENDING_TOKEN_KEY);
      localStorage.setItem(this.PENDING_PROVIDER_KEY, provider);

      const width = 520;
      const height = 650;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        url,
        `talentus_${provider}_login`,
        `width=${width},height=${height},left=${left},top=${top},status=0,toolbar=0,menubar=0`
      );

      if (!popup) {
        reject(new Error('El navegador bloqueó la ventana emergente de autenticación. Permite ventanas emergentes para continuar.'));
        return;
      }

      let isFinished = false;

      const cleanup = () => {
        isFinished = true;
        clearInterval(pollTimer);
        window.removeEventListener('message', messageListener);
        localStorage.removeItem(this.PENDING_TOKEN_KEY);
        localStorage.removeItem(this.PENDING_PROVIDER_KEY);
      };

      // 1. Escuchar eventos postMessage
      const messageListener = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data && event.data.type === 'TALENTUS_OAUTH_TOKEN' && event.data.token) {
          const token = event.data.token;
          cleanup();
          try { popup.close(); } catch {}
          resolve(token);
        }
      };
      window.addEventListener('message', messageListener);

      // 2. Sondeo de fallback con localStorage y control de cierre de ventana
      const pollTimer = setInterval(() => {
        if (isFinished) return;

        // Comprueba si se recibió el token vía localStorage
        const storedToken = localStorage.getItem(this.PENDING_TOKEN_KEY);
        if (storedToken) {
          cleanup();
          try { popup.close(); } catch {}
          resolve(storedToken);
          return;
        }

        // Si la ventana fue cerrada por el usuario sin completar el flujo
        if (popup.closed) {
          cleanup();
          // Espera breve por si el token se escribió milisegundos antes del cierre
          setTimeout(() => {
            const lastCheckToken = localStorage.getItem(this.PENDING_TOKEN_KEY);
            if (lastCheckToken) {
              resolve(lastCheckToken);
            } else {
              reject(new Error(`Ventana de autenticación con ${provider === 'google' ? 'Google' : 'Microsoft'} cerrada sin completar el acceso.`));
            }
          }, 300);
        }
      }, 500);

      // Timeout de seguridad tras 5 minutos
      setTimeout(() => {
        if (!isFinished) {
          cleanup();
          try { popup.close(); } catch {}
          reject(new Error('El tiempo de espera para la autenticación se agotó (timeout 5m).'));
        }
      }, 300000);
    });
  }
}
