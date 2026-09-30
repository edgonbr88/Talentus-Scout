import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-tutor-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dashboard-page container">
      <!-- HEADER DEL PANEL -->
      <header class="dashboard-header">
        <div class="header-info">
          <div class="header-badges">
            <span class="badge badge-verified">TUTOR LEGAL VERIFICADO</span>
            <span class="badge badge-lopnna">LOPNNA ART. 65 ACTIVO</span>
          </div>
          <h1 class="dashboard-title">
            Panel de Gestión: {{ authService.currentUser()?.fullName || 'Tutor Deportivo' }}
          </h1>
          <p class="dashboard-subtitle">
            Administra las cédulas deportivas de tus representados, autorizaciones federativas y visualizaciones de scouts.
          </p>
        </div>

        <div class="header-actions">
          <button (click)="logout()" class="btn btn-secondary">
            Cerrar Sesión
          </button>
        </div>
      </header>

      <!-- BENTO GRID DEL DASHBOARD -->
      <div class="bento-grid dashboard-grid">
        <!-- Tarjeta Principal: Atletas Representados (Span 8) -->
        <div class="bento-card col-span-12 md-col-8">
          <div class="card-top-bar">
            <div class="title-with-badge">
              <h3>Mis Atletas Representados</h3>
              <span class="badge badge-official">0 REGISTRADOS</span>
            </div>
          </div>

          <!-- Estado Vacío Útil y Orientado a la Acción -->
          <div class="empty-state-box">
            <div class="empty-icon">⚽</div>
            <h4>Aún no has registrado a tu primer atleta</h4>
            <p>
              Crea la cédula deportiva digital de tu representado con medidas biométricas, pierna hábil, 
              club actual y genera su enlace público oficial para compartir con clubes y cazatalentos.
            </p>
            <div class="empty-action">
              <button class="btn btn-primary" (click)="openAthleteModal()">
                Registrar Atleta Menor de Edad
              </button>
            </div>
          </div>
        </div>

        <!-- Tarjeta de Estado LOPNNA (Span 4) -->
        <div class="bento-card col-span-12 md-col-4">
          <div class="title-with-badge">
            <span class="shield-badge">🛡️</span>
            <h3>Blindaje Legal LOPNNA</h3>
          </div>
          <div class="status-summary">
            <div class="status-row">
              <span class="status-label">Estado de Consentimiento:</span>
              <span class="badge badge-verified">CONFORME</span>
            </div>
            <div class="status-row">
              <span class="status-label">Artículo Aplicado:</span>
              <span class="status-value">Art. 65 LOPNNA</span>
            </div>
            <div class="status-row">
              <span class="status-label">Patria Potestad:</span>
              <span class="status-value">Declarada</span>
            </div>
          </div>
          <p class="lopnna-info">
            Toda consulta externa de fotos o datos de contacto requiere tu aprobación directa mediante el radar.
          </p>
        </div>

        <!-- Tarjeta de Radar de Visualizaciones (Span 6) -->
        <div class="bento-card col-span-12 md-col-6">
          <div class="title-with-badge">
            <span class="radar-badge">📡</span>
            <h3>Radar de Visualizaciones de Scouts</h3>
          </div>
          <p class="radar-desc">
            Cuando un cazatalentos certificado de la Liga FUTVE o del exterior abra el perfil de tu atleta, 
            el evento aparecerá registrado aquí.
          </p>
          <div class="radar-empty">
            <span>No hay visitas registradas en los últimos 7 días.</span>
          </div>
        </div>

        <!-- Tarjeta de Datos de Cuenta (Span 6) -->
        <div class="bento-card col-span-12 md-col-6">
          <div class="title-with-badge">
            <span class="user-badge">👤</span>
            <h3>Información de tu Perfil de Tutor</h3>
          </div>
          <div class="user-details-list">
            <div class="detail-item">
              <span class="detail-key">Correo:</span>
              <span class="detail-val">{{ authService.currentUser()?.email }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-key">Nombre:</span>
              <span class="detail-val">{{ authService.currentUser()?.fullName }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-key">Teléfono:</span>
              <span class="detail-val">{{ authService.currentUser()?.phoneNumber || 'No especificado' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-key">Rol del Sistema:</span>
              <span class="detail-val">{{ authService.currentUser()?.role }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-page {
      padding: 40px 20px 80px;
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
      margin-bottom: 36px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--color-border);
    }

    .header-badges {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }

    .dashboard-title {
      font-size: 26px;
      margin-bottom: 8px;
    }

    .dashboard-subtitle {
      font-size: 15px;
      color: var(--color-text-muted);
    }

    .col-span-12 {
      grid-column: span 12;
    }

    @media (min-width: 768px) {
      .md-col-8 {
        grid-column: span 8;
      }
      .md-col-6 {
        grid-column: span 6;
      }
      .md-col-4 {
        grid-column: span 4;
      }
    }

    .card-top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .title-with-badge {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
    }

    .empty-state-box {
      text-align: center;
      padding: 36px 20px;
      background-color: #0E1527;
      border: 1px dashed var(--color-border);
      border-radius: var(--radius-sm);
    }

    .empty-icon {
      font-size: 32px;
      margin-bottom: 12px;
    }

    .empty-state-box h4 {
      font-size: 17px;
      margin-bottom: 8px;
    }

    .empty-state-box p {
      font-size: 13px;
      margin: 0 auto 20px;
      max-width: 50ch;
    }

    .status-summary {
      display: flex;
      flex-direction: column;
      gap: 12px;
      background-color: #0E1527;
      padding: 16px;
      border-radius: var(--radius-sm);
      margin-bottom: 16px;
      border: 1px solid var(--color-border);
    }

    .status-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
    }

    .status-label {
      color: var(--color-text-muted);
    }

    .status-value {
      font-weight: 600;
      color: var(--color-text-main);
    }

    .lopnna-info {
      font-size: 12px;
      color: var(--color-text-muted);
      line-height: 1.5;
    }

    .radar-desc {
      font-size: 13px;
      margin-bottom: 16px;
    }

    .radar-empty {
      padding: 20px;
      background-color: #0E1527;
      border-radius: var(--radius-sm);
      text-align: center;
      font-size: 13px;
      color: var(--color-text-dim);
      border: 1px solid var(--color-border);
    }

    .user-details-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .detail-item {
      display: flex;
      justify-content: space-between;
      padding: 10px 14px;
      background-color: #0E1527;
      border-radius: var(--radius-sm);
      font-size: 13px;
      border: 1px solid var(--color-border);
    }

    .detail-key {
      color: var(--color-text-muted);
    }

    .detail-val {
      font-weight: 600;
      color: var(--color-text-main);
    }

    @media (max-width: 640px) {
      .dashboard-header {
        flex-direction: column;
      }
    }
  `]
})
export class TutorDashboardComponent implements OnInit {
  authService = inject(AuthService);

  ngOnInit(): void {
    if (!this.authService.currentUser() && this.authService.token()) {
      this.authService.fetchCurrentUser().subscribe();
    }
  }

  openAthleteModal(): void {
    alert('Módulo de Cédula Deportiva: Próxima integración con TS-05 para registro biométrico de atletas.');
  }

  logout(): void {
    this.authService.logout();
  }
}
