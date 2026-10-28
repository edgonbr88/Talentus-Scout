import { Component, OnInit, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ScoutDirectoryService } from '../../core/services/scout-directory.service';
import { PageResponse, ScoutDirectoryAthleteItem, ScoutDirectoryFilters } from '../../core/models/scout-directory.model';
import { VideoPlayerComponent } from '../../shared/components/video-player/video-player.component';
import { MediaUrlPipe } from '../../core/pipes/media-url.pipe';

export interface CategoryOption {
  label: string;
  birthYear: number | null;
  description: string;
}

@Component({
  selector: 'app-scout-directory',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, VideoPlayerComponent, MediaUrlPipe],
  templateUrl: './scout-directory.component.html',
  styleUrls: ['./scout-directory.component.css']
})
export class ScoutDirectoryComponent implements OnInit {
  private directoryService = inject(ScoutDirectoryService);

  // Estados Reactivos con Signals
  athletes = signal<ScoutDirectoryAthleteItem[]>([]);
  totalElements = signal<number>(0);
  totalPages = signal<number>(0);
  currentPage = signal<number>(0);
  pageSize = signal<number>(12);
  isLoading = signal<boolean>(false);
  hasError = signal<boolean>(false);

  // Estado de Contacto Seguro WhatsApp
  contactingAthleteId = signal<string | null>(null);

  // Modal de Reproducción Rápida
  activeVideoModal = signal<ScoutDirectoryAthleteItem | null>(null);

  // Panel de Filtros Desplegable
  showAdvancedFilters = signal<boolean>(false);

  // Filtros seleccionados
  selectedBirthYear = signal<number | null>(null);
  selectedBirthYearFrom = signal<number | null>(null);
  selectedBirthYearTo = signal<number | null>(null);
  availableBirthYears = signal<number[]>([]);
  selectedPosition = signal<string>('');
  selectedFoot = signal<string>('');
  selectedResidenceCountry = signal<string>('');
  filterOnlyWithVideo = signal<boolean>(false);
  filterOnlyEuropeanPassport = signal<boolean>(false);

  // Opciones de Categorías Rápidas por Chips
  readonly categoryChips: CategoryOption[] = [
    { label: 'Todos', birthYear: null, description: 'Radar general' },
    { label: 'Sub-15', birthYear: 2011, description: 'Generación 2011-2012' },
    { label: 'Sub-17', birthYear: 2009, description: 'Generación 2009-2010' },
    { label: 'Sub-20', birthYear: 2007, description: 'Generación 2007-2008' }
  ];

  // Opciones de Posiciones
  readonly positionOptions = [
    { value: '', label: 'Todas las posiciones' },
    { value: 'PORTERO', label: 'Portero (POR)' },
    { value: 'DEFENSA_CENTRAL', label: 'Defensa Central (DFC)' },
    { value: 'LATERAL_DERECHO', label: 'Lateral Derecho (LD)' },
    { value: 'LATERAL_IZQUIERDO', label: 'Lateral Izquierdo (LI)' },
    { value: 'PIVOTE_DEFENSIVO', label: 'Pivote Defensivo (MCD)' },
    { value: 'MEDIOCAMPISTA_OFENSIVO', label: 'Mediocampista Ofensivo (MCO)' },
    { value: 'EXTREMO_DERECHO', label: 'Extremo Derecho (ED)' },
    { value: 'EXTREMO_IZQUIERDO', label: 'Extremo Izquierdo (EI)' },
    { value: 'DELANTERO_CENTRO', label: 'Delantero Centro (DC)' }
  ];

  // Opciones de Pierna Hábil
  readonly footOptions = [
    { value: '', label: 'Cualquier perfil' },
    { value: 'DIESTRO', label: 'Diestro' },
    { value: 'ZURDO', label: 'Zurdo' },
    { value: 'AMBIDIESTRO', label: 'Ambidiestro' }
  ];

  // Opciones de País de Residencia Autorizado
  readonly countryOptions: string[] = [
    'Venezuela',
    'Colombia',
    'Chile',
    'Perú',
    'Ecuador',
    'Bolivia'
  ];

  ngOnInit(): void {
    this.loadAvailableBirthYears();
    this.fetchAthletes();
  }

  loadAvailableBirthYears(): void {
    this.directoryService.getAvailableBirthYears().subscribe({
      next: (years) => {
        this.availableBirthYears.set(years || []);
      },
      error: (err) => {
        console.error('Error al cargar años de nacimiento disponibles:', err);
      }
    });
  }

  fetchAthletes(page = 0): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    const filters: ScoutDirectoryFilters = {
      page,
      size: this.pageSize(),
      birthYear: this.selectedBirthYear(),
      birthYearFrom: this.selectedBirthYearFrom(),
      birthYearTo: this.selectedBirthYearTo(),
      primaryPosition: this.selectedPosition() ? this.selectedPosition() : null,
      preferredFoot: this.selectedFoot() ? this.selectedFoot() : null,
      residenceCountry: this.selectedResidenceCountry() ? this.selectedResidenceCountry() : null,
      hasVideo: this.filterOnlyWithVideo() ? true : null,
      hasEuropeanPassport: this.filterOnlyEuropeanPassport() ? true : null
    };

    this.directoryService.getDirectory(filters).subscribe({
      next: (response: PageResponse<ScoutDirectoryAthleteItem>) => {
        this.athletes.set(response.content || []);
        this.totalElements.set(response.totalElements || 0);
        this.totalPages.set(response.totalPages || 0);
        this.currentPage.set(response.number || 0);
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      }
    });
  }

  selectCategory(birthYear: number | null): void {
    this.selectedBirthYear.set(birthYear);
    this.selectedBirthYearFrom.set(null);
    this.selectedBirthYearTo.set(null);
    this.fetchAthletes(0);
  }

  onYearFromChange(value: number | null): void {
    this.selectedBirthYearFrom.set(value);
    this.selectedBirthYear.set(null);
    this.fetchAthletes(0);
  }

  onYearToChange(value: number | null): void {
    this.selectedBirthYearTo.set(value);
    this.selectedBirthYear.set(null);
    this.fetchAthletes(0);
  }

  onYearRangeChange(): void {
    this.selectedBirthYear.set(null);
    this.fetchAthletes(0);
  }

  onFilterChange(): void {
    this.fetchAthletes(0);
  }

  toggleVideoFilter(): void {
    this.filterOnlyWithVideo.update((prev) => !prev);
    this.fetchAthletes(0);
  }

  togglePassportFilter(): void {
    this.filterOnlyEuropeanPassport.update((prev) => !prev);
    this.fetchAthletes(0);
  }

  toggleAdvancedFilters(): void {
    this.showAdvancedFilters.update((prev) => !prev);
  }

  resetFilters(): void {
    this.selectedBirthYear.set(null);
    this.selectedBirthYearFrom.set(null);
    this.selectedBirthYearTo.set(null);
    this.selectedPosition.set('');
    this.selectedFoot.set('');
    this.selectedResidenceCountry.set('');
    this.filterOnlyWithVideo.set(false);
    this.filterOnlyEuropeanPassport.set(false);
    this.fetchAthletes(0);
  }

  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages()) {
      this.fetchAthletes(page);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }

  contactTutor(athlete: ScoutDirectoryAthleteItem, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (this.contactingAthleteId()) {
      return;
    }

    this.contactingAthleteId.set(athlete.id);
    this.directoryService.contactAthleteTutor(athlete.id).subscribe({
      next: (response) => {
        this.contactingAthleteId.set(null);
        if (response.whatsappUrl && typeof window !== 'undefined') {
          window.open(response.whatsappUrl, '_blank', 'noopener,noreferrer');
        }
      },
      error: (err) => {
        this.contactingAthleteId.set(null);
        console.error('Error al generar enlace seguro de WhatsApp:', err);
      }
    });
  }

  openVideoModal(athlete: ScoutDirectoryAthleteItem): void {
    if (athlete.hasVideo && athlete.featuredVideoPlaybackUrl) {
      this.activeVideoModal.set(athlete);
    }
  }

  closeVideoModal(): void {
    this.activeVideoModal.set(null);
  }

  @HostListener('window:keydown.escape')
  onEscapePress(): void {
    if (this.activeVideoModal()) {
      this.closeVideoModal();
    }
  }

  getPositionBadgeClass(position: string): string {
    const pos = (position || '').toUpperCase();
    if (pos.includes('DELANTERO') || pos.includes('EXTREMO')) {
      return 'badge-attack';
    }
    if (pos.includes('MEDIOCAMPISTA') || pos.includes('PIVOTE') || pos.includes('VOLANTE')) {
      return 'badge-midfield';
    }
    if (pos.includes('DEFENSA') || pos.includes('LATERAL') || pos.includes('CENTRAL')) {
      return 'badge-defense';
    }
    if (pos.includes('PORTERO') || pos.includes('ARQUERO')) {
      return 'badge-gk';
    }
    return 'badge-neutral';
  }
}
