import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export type BrandLogoVariant = 'isotipo' | 'logotipo' | 'imagotipo';
export type BrandLogoTheme = 'color' | 'negativo' | 'positivo' | 'dark';

@Component({
  selector: 'app-brand-logo',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './brand-logo.component.html',
  styleUrls: ['./brand-logo.component.css']
})
export class BrandLogoComponent {
  @Input() variant: BrandLogoVariant = 'imagotipo';
  @Input() theme: BrandLogoTheme = 'color';
  @Input() height: number | string = 40;
  @Input() width: number | string = 'auto';
  @Input() altText: string = 'Talentus Scout — Radar Oficial del Fútbol Juvenil';
  @Input() clickable: boolean = false;
  @Input() customClass: string = '';

  get logoSrc(): string {
    const validVariant = ['isotipo', 'logotipo', 'imagotipo'].includes(this.variant)
      ? this.variant
      : 'imagotipo';
    const validTheme = ['color', 'negativo', 'positivo', 'dark'].includes(this.theme)
      ? this.theme
      : 'color';

    return `/assets/branding/ts-${validVariant}-${validTheme}.svg`;
  }

  get styleHeight(): string {
    return typeof this.height === 'number' ? `${this.height}px` : this.height;
  }

  get styleWidth(): string {
    return typeof this.width === 'number' ? `${this.width}px` : this.width;
  }
}
