import { Component, OnInit, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AthleteService } from '../../core/services/athlete.service';
import { SeoService } from '../../core/services/seo.service';
import { AuthService } from '../../core/auth/auth.service';
import { ScoutDirectoryService } from '../../core/services/scout-directory.service';
import { PublicAthleteResponse, PublicVideoDto } from '../../core/models/athlete.model';
import { VideoPlayerComponent } from '../../shared/components/video-player/video-player.component';
import { MediaUrlPipe } from '../../core/pipes/media-url.pipe';
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component';

@Component({
  selector: 'app-bento-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, VideoPlayerComponent, MediaUrlPipe, BrandLogoComponent],
  templateUrl: './bento-profile.component.html',
  styleUrls: ['./bento-profile.component.css']
})
export class BentoProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private athleteService = inject(AthleteService);
  private seoService = inject(SeoService);
  private authService = inject(AuthService);
  private scoutDirectoryService = inject(ScoutDirectoryService);
  private platformId = inject(PLATFORM_ID);

  public athlete = signal<PublicAthleteResponse | null>(null);
  public activeVideo = signal<PublicVideoDto | null>(null);
  public isLoading = signal<boolean>(true);
  public errorMessage = signal<string | null>(null);
  public copiedNotification = signal<boolean>(false);
  public isDownloadingCv = signal<boolean>(false);
  public isContacting = signal<boolean>(false);
  public showAuthPrompt = signal<boolean>(false);

  public isScout = computed(() => {
    const role = this.authService.currentUser()?.role;
    return role === 'SCOUT' || role === 'ADMIN';
  });

  public birthYear = computed(() => {
    const a = this.athlete();
    if (!a?.birthDate) return null;
    return new Date(a.birthDate).getFullYear();
  });

  public formattedPassports = computed(() => {
    const a = this.athlete();
    if (!a?.secondaryPassports) return null;
    return a.secondaryPassports.trim();
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const slug = params.get('slug');
      if (slug) {
        this.fetchProfile(slug);
      } else {
        this.errorMessage.set('Identificador de atleta inválido.');
        this.isLoading.set(false);
      }
    });
  }

  private fetchProfile(slug: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.athleteService.getPublicAthleteBySlug(slug).subscribe({
      next: (data) => {
        this.athlete.set(data);
        if (data.videos && data.videos.length > 0) {
          this.activeVideo.set(data.videos[0]);
        }
        this.seoService.setAthleteProfileMeta(data);
        this.isLoading.set(false);

        // Si quien visualiza es un scout autenticado, registrar la visita para el radar
        if (this.isScout()) {
          this.scoutDirectoryService.logAthleteView(data.id).subscribe({
            error: () => {}
          });
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err.status === 404) {
          this.errorMessage.set('El perfil deportivo solicitado no existe o fue configurado como privado.');
        } else {
          this.errorMessage.set('Ocurrió un error al cargar la ficha del atleta. Intenta nuevamente.');
        }
      }
    });
  }

  selectVideo(video: PublicVideoDto): void {
    this.activeVideo.set(video);
  }

  contactTutor(): void {
    const a = this.athlete();
    if (!a || this.isContacting()) return;

    this.isContacting.set(true);
    this.scoutDirectoryService.contactAthleteTutor(a.id).subscribe({
      next: (response) => {
        this.isContacting.set(false);
        if (response.whatsappUrl && isPlatformBrowser(this.platformId)) {
          window.open(response.whatsappUrl, '_blank', 'noopener,noreferrer');
        }
      },
      error: (err) => {
        this.isContacting.set(false);
        console.error('Error al generar enlace seguro de WhatsApp:', err);
      }
    });
  }

  shareOnWhatsApp(): void {
    const a = this.athlete();
    if (!a) return;

    const currentUrl = isPlatformBrowser(this.platformId)
      ? window.location.href
      : `https://talentus.app/atleta/${a.slug}`;

    const text = `¡Descubre el perfil de ${a.fullName} (${a.primaryPosition}) en Talentus Scout!\nFicha deportiva, jugadas destacadas y biotipo oficial:\n${currentUrl}`;
    const encoded = encodeURIComponent(text);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encoded}`;

    if (isPlatformBrowser(this.platformId)) {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }
  }

  copyProfileLink(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      this.copiedNotification.set(true);
      setTimeout(() => this.copiedNotification.set(false), 3000);
    });
  }

  downloadCvPdf(): void {
    const a = this.athlete();
    if (!a) return;

    if (!this.authService.isAuthenticated()) {
      this.showAuthPrompt.set(true);
      return;
    }

    this.isDownloadingCv.set(true);
    this.athleteService.downloadAthleteCvPdf(a.id).subscribe({
      next: (blob) => {
        this.isDownloadingCv.set(false);
        if (isPlatformBrowser(this.platformId)) {
          const url = window.URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = `CV_Deportivo_${a.slug || a.id}.pdf`;
          document.body.appendChild(anchor);
          anchor.click();
          document.body.removeChild(anchor);
          window.URL.revokeObjectURL(url);
        }
      },
      error: (err) => {
        this.isDownloadingCv.set(false);
        console.error('Error al descargar el CV:', err);
        if (err.status === 403) {
          alert('Solo el representante legal del atleta, scouts acreditados o administradores pueden descargar la Ficha Técnica oficial.');
        } else {
          alert('No se pudo generar la Ficha Técnica en PDF. Por favor intenta más tarde.');
        }
      }
    });
  }

  closeAuthPrompt(): void {
    this.showAuthPrompt.set(false);
  }
}
