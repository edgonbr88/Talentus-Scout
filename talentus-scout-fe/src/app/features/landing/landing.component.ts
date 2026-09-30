import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="landing-page">
      <!-- HERO PRINCIPAL -->
      <section class="hero-section">
        <div class="container hero-container">
          <div class="hero-content">
            <div class="hero-badge">
              <span class="badge badge-official">FEDERACIÓN Y ACADEMIAS JUVENILES</span>
              <span class="badge badge-lopnna">PROTECCIÓN LOPNNA ART. 65</span>
            </div>

            <h1 class="hero-title">
              El Radar Oficial del Talento Futbolístico Juvenil de Venezuela
            </h1>

            <p class="hero-description">
              Digitalizamos la carrera deportiva de atletas menores de edad con consentimiento legal de sus padres, 
              conectando academias de fútbol con scouts certificados de la Liga FUTVE e internacionales.
            </p>

            <div class="hero-actions">
              <a routerLink="/register-tutor" class="btn btn-primary btn-lg">
                Registrar Tutor Legal y Atletas
              </a>
              <a routerLink="/login" class="btn btn-secondary btn-lg">
                Acceder a mi Cuenta
              </a>
            </div>

            <div class="hero-metrics">
              <div class="metric-item">
                <span class="metric-value">100%</span>
                <span class="metric-label">Consentimiento LOPNNA verificado</span>
              </div>
              <div class="metric-divider"></div>
              <div class="metric-item">
                <span class="metric-value">1 Clic</span>
                <span class="metric-label">Generación de CV Deportivo Oficial</span>
              </div>
              <div class="metric-divider"></div>
              <div class="metric-item">
                <span class="metric-value">0 Spam</span>
                <span class="metric-label">Contacto directo autorizado</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- SECCIÓN BENTO GRID: CARACTERÍSTICAS CLAVE -->
      <section class="bento-section">
        <div class="container">
          <div class="section-header">
            <span class="section-eyebrow">ARQUITECTURA DE LA PLATAFORMA</span>
            <h2 class="section-title">Ecosistema Diseñado para Proteger e Impulsar Atletas</h2>
            <p class="section-subtitle">
              Estructura modular orientada a la privacidad del menor y la rigurosidad biométrica requerida por clubes profesionales.
            </p>
          </div>

          <div class="bento-grid">
            <!-- Bento Card 1: Cédula Deportiva -->
            <div class="bento-card col-span-12 md-col-8">
              <div class="card-icon-wrapper pitch">
                <span>📋</span>
              </div>
              <div class="card-header-group">
                <span class="badge badge-verified">IDENTIDAD DEPORTIVA</span>
                <h3>Cédula Biométrica y Ficha Técnica Canónica</h3>
              </div>
              <p>
                Perfil unificado con pierna hábil, posiciones primaria/secundaria, historial federativo, 
                medidas antropométricas certificadas y enlace público único amigable para compartir con clubes.
              </p>
              <div class="card-preview-box">
                <div class="mock-athlete-preview">
                  <div class="mock-avatar">GP</div>
                  <div class="mock-details">
                    <span class="mock-name">Gabriel Pérez · Categoría Sub-15</span>
                    <span class="mock-club">Deportivo Miranda · Delantero Centro · Diestro</span>
                  </div>
                  <span class="badge badge-official">VERIFICADO</span>
                </div>
              </div>
            </div>

            <!-- Bento Card 2: Blindaje LOPNNA -->
            <div class="bento-card col-span-12 md-col-4">
              <div class="card-icon-wrapper lopnna">
                <span>🛡️</span>
              </div>
              <div class="card-header-group">
                <span class="badge badge-lopnna">SEGURIDAD LEGAL</span>
                <h3>Blindaje LOPNNA Art. 65</h3>
              </div>
              <p>
                Aislamiento estricto de datos. Solamente el representante con patria potestad puede autorizar 
                la visibilidad de fotos, videos y contactos con veedores autorizados.
              </p>
            </div>

            <!-- Bento Card 3: Video Streaming HLS -->
            <div class="bento-card col-span-12 md-col-4">
              <div class="card-icon-wrapper video">
                <span>⚡</span>
              </div>
              <div class="card-header-group">
                <span class="badge badge-verified">STREAMING HLS</span>
                <h3>Jugadas y Clips Sin Cortes</h3>
              </div>
              <p>
                Streaming optimizado con tasa de bits adaptativa para conexiones móviles en Venezuela, 
                permitiendo a scouts evaluar partidos completos y mejores jugadas en alta definición.
              </p>
            </div>

            <!-- Bento Card 4: Radar de Vistas -->
            <div class="bento-card col-span-12 md-col-8">
              <div class="card-icon-wrapper gold">
                <span>🎯</span>
              </div>
              <div class="card-header-group">
                <span class="badge badge-official">MONITOREO DE VEEDORES</span>
                <h3>Radar de Visualizaciones de Scouts en Tiempo Real</h3>
              </div>
              <p>
                Los tutores reciben métricas detalladas cada vez que un cazatalentos oficial de la Liga FUTVE 
                o un club internacional abre la cédula deportiva o reproduce los videos del atleta.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  `,
  styles: [`
    .landing-page {
      padding-bottom: 80px;
    }

    .hero-section {
      padding: 70px 0 60px;
      border-bottom: 1px solid var(--color-border);
      background: radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.08) 0%, rgba(10, 15, 29, 0) 70%);
    }

    .hero-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .hero-content {
      max-width: 860px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .hero-badge {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 10px;
      margin-bottom: 24px;
    }

    .hero-title {
      margin-bottom: 20px;
      line-height: 1.15;
    }

    .hero-description {
      font-size: 17px;
      color: var(--color-text-muted);
      margin-bottom: 36px;
      max-width: 70ch;
    }

    .hero-actions {
      display: flex;
      gap: 16px;
      margin-bottom: 48px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .btn-lg {
      padding: 14px 28px;
      font-size: 15px;
      font-weight: 700;
    }

    .hero-metrics {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 32px;
      padding: 20px 32px;
      background-color: rgba(20, 29, 48, 0.7);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      backdrop-filter: blur(8px);
    }

    .metric-item {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .metric-value {
      font-family: var(--font-family-display);
      font-size: 22px;
      font-weight: 800;
      color: var(--color-accent-pitch);
      line-height: 1.2;
    }

    .metric-label {
      font-size: 12px;
      color: var(--color-text-muted);
    }

    .metric-divider {
      width: 1px;
      height: 36px;
      background-color: var(--color-border);
    }

    /* Bento Section */
    .bento-section {
      padding: 80px 0 40px;
    }

    .section-header {
      text-align: center;
      margin-bottom: 48px;
    }

    .section-eyebrow {
      font-family: var(--font-family-display);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.15em;
      color: var(--color-accent-pitch);
      display: block;
      margin-bottom: 10px;
    }

    .section-title {
      margin-bottom: 12px;
    }

    .section-subtitle {
      margin: 0 auto;
    }

    /* Grid layout */
    .col-span-12 {
      grid-column: span 12;
    }

    @media (min-width: 768px) {
      .md-col-8 {
        grid-column: span 8;
      }
      .md-col-4 {
        grid-column: span 4;
      }
    }

    .card-icon-wrapper {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      margin-bottom: 18px;
    }

    .card-icon-wrapper.pitch {
      background-color: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .card-icon-wrapper.lopnna {
      background-color: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.3);
    }

    .card-icon-wrapper.video {
      background-color: rgba(56, 189, 248, 0.15);
      border: 1px solid rgba(56, 189, 248, 0.3);
    }

    .card-icon-wrapper.gold {
      background-color: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.3);
    }

    .card-header-group {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
      margin-bottom: 12px;
    }

    .card-preview-box {
      margin-top: 20px;
      background-color: #0E1527;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      padding: 14px 18px;
    }

    .mock-athlete-preview {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .mock-avatar {
      width: 42px;
      height: 42px;
      border-radius: var(--radius-full);
      background: linear-gradient(135deg, #10B981, #065F46);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      color: white;
      font-size: 14px;
    }

    .mock-details {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .mock-name {
      font-weight: 600;
      color: var(--color-text-main);
      font-size: 14px;
    }

    .mock-club {
      font-size: 12px;
      color: var(--color-text-muted);
    }

    @media (max-width: 640px) {
      .hero-metrics {
        flex-direction: column;
        gap: 16px;
      }
      .metric-divider {
        display: none;
      }
    }
  `]
})
export class LandingComponent {}
