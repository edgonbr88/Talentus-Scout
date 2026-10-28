import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent {
  readonly emailCopied = signal<boolean>(false);
  private copyTimeout: any = null;

  readonly officialEmail = 'contacto@talentusscout.com';
  readonly instagramUrl = 'https://www.instagram.com/talentusscout/';

  copyEmail(): void {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(this.officialEmail).then(() => {
        this.triggerCopiedFeedback();
      }).catch(() => {
        this.fallbackCopyText(this.officialEmail);
      });
    } else {
      this.fallbackCopyText(this.officialEmail);
    }
  }

  private triggerCopiedFeedback(): void {
    this.emailCopied.set(true);
    if (this.copyTimeout) {
      clearTimeout(this.copyTimeout);
    }
    this.copyTimeout = setTimeout(() => {
      this.emailCopied.set(false);
    }, 2500);
  }

  private fallbackCopyText(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      this.triggerCopiedFeedback();
    } catch (err) {
      console.warn('No se pudo copiar el correo al portapapeles', err);
    }
    document.body.removeChild(textArea);
  }
}
