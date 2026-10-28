import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { PublicAthleteResponse } from '../models/athlete.model';

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private titleService = inject(Title);
  private metaService = inject(Meta);

  setAthleteProfileMeta(athlete: PublicAthleteResponse, currentUrl?: string): void {
    const birthYear = athlete.birthDate ? new Date(athlete.birthDate).getFullYear() : '';
    const categoryInfo = birthYear ? ` (${birthYear})` : '';
    const clubInfo = athlete.club?.name ? ` • ${athlete.club.name}` : '';
    const positionInfo = athlete.primaryPosition || 'Atleta Juvenil';

    const pageTitle = `${athlete.fullName}${categoryInfo} — ${positionInfo}${clubInfo} | Talentus Scout`;
    const description = `Ficha deportiva oficial y jugadas destacadas de ${athlete.fullName} (${athlete.age} años), ${positionInfo}${clubInfo}. Ficha verificada en Talentus Scout.`;
    const pageUrl = currentUrl || `https://talentus.app/atleta/${athlete.slug}`;
    const imageUrl = athlete.profilePhotoUrl || 'https://i.imgur.com/9j8oQ2B.png';

    // 1. Título de la página
    this.titleService.setTitle(pageTitle);

    // 2. Metadatos estándar
    this.metaService.updateTag({ name: 'description', content: description });

    // 3. Open Graph (WhatsApp, Instagram, Facebook, LinkedIn)
    this.metaService.updateTag({ property: 'og:title', content: `${athlete.fullName} — ${positionInfo} | Talentus Scout` });
    this.metaService.updateTag({ property: 'og:description', content: description });
    this.metaService.updateTag({ property: 'og:image', content: imageUrl });
    this.metaService.updateTag({ property: 'og:url', content: pageUrl });
    this.metaService.updateTag({ property: 'og:type', content: 'profile' });
    this.metaService.updateTag({ property: 'og:site_name', content: 'Talentus Scout' });

    // 4. Perfil Open Graph
    if (athlete.firstName) {
      this.metaService.updateTag({ property: 'profile:first_name', content: athlete.firstName });
    }
    if (athlete.lastName) {
      this.metaService.updateTag({ property: 'profile:last_name', content: athlete.lastName });
    }

    // 5. Twitter Card
    this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:title', content: `${athlete.fullName} — ${positionInfo} | Talentus Scout` });
    this.metaService.updateTag({ name: 'twitter:description', content: description });
    this.metaService.updateTag({ name: 'twitter:image', content: imageUrl });
  }
}
