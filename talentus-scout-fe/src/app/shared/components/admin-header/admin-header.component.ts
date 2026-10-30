import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface AdminNavModule {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-admin-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './admin-header.component.html',
  styleUrls: ['./admin-header.component.css']
})
export class AdminHeaderComponent {
  @Input({ required: true }) title!: string;
  @Input({ required: true }) subtitle!: string;
  @Input() badgeText = 'SALVAGUARDA LOPNNA & FIFA';

  readonly navModules: AdminNavModule[] = [
    { label: 'Auditoría Scouts', icon: '🕵️‍♂️', route: '/admin/scouts' },
    { label: 'Patria Potestad', icon: '⚖️', route: '/admin/verificacion-legal' },
    { label: 'Auditoría Pagos', icon: '💳', route: '/admin/pagos' },
    { label: 'Clubes y Academias', icon: '🛡️', route: '/admin/clubes' }
  ];
}
