import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <header class="navbar-header">
      <div class="container navbar-container">
        <!-- Logotipo Oficial Talentus Scout -->
        <a routerLink="/" class="navbar-brand">
          <div class="brand-crest">
            <span class="crest-icon">⚽</span>
          </div>
          <div class="brand-text">
            <span class="brand-title">TALENTUS</span>
            <span class="brand-subtitle">SCOUT</span>
          </div>
        </a>

        <!-- Navegación Principal -->
        <nav class="navbar-nav">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="nav-link">Inicio</a>
          @if (authService.isAuthenticated()) {
            <a routerLink="/dashboard" routerLinkActive="active" class="nav-link">Mi Panel</a>
          }
        </nav>

        <!-- Acciones de Usuario / Autenticación -->
        <div class="navbar-actions">
          @if (authService.isAuthenticated()) {
            <div class="user-pill">
              <span class="badge badge-official">{{ authService.currentUser()?.role || 'USUARIO' }}</span>
              <span class="user-name">{{ authService.currentUser()?.fullName || authService.currentUser()?.email }}</span>
            </div>
            <button (click)="logout()" class="btn btn-secondary btn-sm">Cerrar sesión</button>
          } @else {
            <a routerLink="/login" class="btn btn-secondary btn-sm">Iniciar sesión</a>
            <a routerLink="/register-tutor" class="btn btn-primary btn-sm">Registro Tutor LOPNNA</a>
          }
        </div>
      </div>
    </header>
  `,
  styles: [`
    .navbar-header {
      background-color: rgba(10, 15, 29, 0.92);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--color-border);
      position: sticky;
      top: 0;
      z-index: 100;
      padding: 12px 0;
    }

    .navbar-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .navbar-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
    }

    .brand-crest {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: linear-gradient(135deg, #10B981 0%, #064E3B 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      border: 1px solid rgba(16, 185, 129, 0.4);
    }

    .brand-text {
      display: flex;
      flex-direction: column;
      line-height: 1.1;
    }

    .brand-title {
      font-family: var(--font-family-display);
      font-weight: 800;
      font-size: 16px;
      letter-spacing: 0.05em;
      color: var(--color-text-main);
    }

    .brand-subtitle {
      font-family: var(--font-family-display);
      font-weight: 600;
      font-size: 10px;
      letter-spacing: 0.25em;
      color: var(--color-accent-pitch);
    }

    .navbar-nav {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .nav-link {
      font-size: 14px;
      font-weight: 500;
      color: var(--color-text-muted);
      transition: color var(--transition-fast);
      padding: 6px 4px;
    }

    .nav-link:hover, .nav-link.active {
      color: var(--color-text-main);
    }

    .nav-link.active {
      border-bottom: 2px solid var(--color-accent-pitch);
    }

    .navbar-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .user-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      background-color: var(--color-surface);
      padding: 5px 12px;
      border-radius: var(--radius-full);
      border: 1px solid var(--color-border);
    }

    .user-name {
      font-size: 13px;
      font-weight: 500;
      color: var(--color-text-main);
      max-width: 140px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .btn-sm {
      padding: 7px 14px;
      font-size: 13px;
    }

    @media (max-width: 768px) {
      .navbar-nav {
        display: none;
      }
      .user-name {
        display: none;
      }
    }
  `]
})
export class NavbarComponent {
  authService = inject(AuthService);

  logout(): void {
    this.authService.logout();
  }
}
