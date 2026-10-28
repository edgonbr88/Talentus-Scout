import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScoutDirectoryComponent } from './scout-directory.component';
import { ScoutDirectoryService } from '../../core/services/scout-directory.service';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { PageResponse, ScoutDirectoryAthleteItem } from '../../core/models/scout-directory.model';

describe('ScoutDirectoryComponent', () => {
  let component: ScoutDirectoryComponent;
  let fixture: ComponentFixture<ScoutDirectoryComponent>;
  let directoryServiceSpy: jasmine.SpyObj<ScoutDirectoryService>;

  const mockAthletes: ScoutDirectoryAthleteItem[] = [
    {
      id: 'ath-01',
      firstName: 'Alejandro',
      lastName: 'Gómez',
      birthDate: '2010-05-20',
      birthYear: 2010,
      category: 'Sub-17',
      primaryPosition: 'DELANTERO_CENTRO',
      preferredFoot: 'ZURDO',
      nationality: 'Venezolana',
      residenceCountry: 'Venezuela',
      secondaryPassports: 'Español (UE)',
      hasEuropeanPassport: true,
      clubName: 'Caracas FC Academy',
      slug: 'alejandro-gomez',
      verifiedBadgesCount: 2,
      hasVideo: true,
      featuredVideoPlaybackUrl: 'https://videodelivery.net/stream/manifest.m3u8',
      featuredVideoThumbnailUrl: 'https://videodelivery.net/stream/thumb.jpg',
      featuredVideoTitle: 'Goles 2026',
      updatedAt: '2026-10-08T10:00:00Z'
    }
  ];

  const mockResponse: PageResponse<ScoutDirectoryAthleteItem> = {
    content: mockAthletes,
    totalElements: 1,
    totalPages: 1,
    size: 12,
    number: 0,
    first: true,
    last: true,
    empty: false
  };

  beforeEach(async () => {
    directoryServiceSpy = jasmine.createSpyObj('ScoutDirectoryService', ['getDirectory', 'getAvailableBirthYears']);
    directoryServiceSpy.getDirectory.and.returnValue(of(mockResponse));
    directoryServiceSpy.getAvailableBirthYears.and.returnValue(of([2012, 2011, 2010, 2009, 2008]));

    await TestBed.configureTestingModule({
      imports: [ScoutDirectoryComponent],
      providers: [
        { provide: ScoutDirectoryService, useValue: directoryServiceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map() } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ScoutDirectoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debe cargar los atletas iniciales del directorio', () => {
    expect(directoryServiceSpy.getDirectory).toHaveBeenCalled();
    expect(component.athletes().length).toBe(1);
    expect(component.athletes()[0].firstName).toBe('Alejandro');
    expect(component.athletes()[0].residenceCountry).toBe('Venezuela');
    expect(component.totalElements()).toBe(1);
  });

  it('debe filtrar por chip de categoría', () => {
    component.selectCategory(2011);
    expect(component.selectedBirthYear()).toBe(2011);
    expect(directoryServiceSpy.getDirectory).toHaveBeenCalledTimes(2);
  });

  it('debe filtrar por país de residencia y enviar el parámetro a directoryService (TS-45)', () => {
    component.selectedResidenceCountry.set('Bolivia');
    component.onFilterChange();

    expect(directoryServiceSpy.getDirectory).toHaveBeenCalledWith(jasmine.objectContaining({
      residenceCountry: 'Bolivia',
      page: 0
    }));
  });

  it('debe reiniciar el filtro de país de residencia al llamar a resetFilters (TS-45)', () => {
    component.selectedResidenceCountry.set('Colombia');
    component.resetFilters();

    expect(component.selectedResidenceCountry()).toBe('');
    expect(directoryServiceSpy.getDirectory).toHaveBeenCalledWith(jasmine.objectContaining({
      residenceCountry: null,
      page: 0
    }));
  });

  it('debe alternar los filtros de video y pasaporte', () => {
    component.toggleVideoFilter();
    expect(component.filterOnlyWithVideo()).toBeTrue();

    component.togglePassportFilter();
    expect(component.filterOnlyEuropeanPassport()).toBeTrue();
  });

  it('debe abrir y cerrar el modal interactivo de video', () => {
    const athleteWithVideo = mockAthletes[0];
    component.openVideoModal(athleteWithVideo);
    expect(component.activeVideoModal()).toEqual(athleteWithVideo);

    component.closeVideoModal();
    expect(component.activeVideoModal()).toBeNull();
  });

  it('debe calcular la clase CSS táctica de la posición', () => {
    expect(component.getPositionBadgeClass('DELANTERO_CENTRO')).toBe('badge-attack');
    expect(component.getPositionBadgeClass('MEDIOCAMPISTA_OFENSIVO')).toBe('badge-midfield');
    expect(component.getPositionBadgeClass('DEFENSA_CENTRAL')).toBe('badge-defense');
    expect(component.getPositionBadgeClass('PORTERO')).toBe('badge-gk');
  });

  it('debe renderizar el badge de país de residencia en la tarjeta Bento', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const countryTag = compiled.querySelector('.country-tag');
    expect(countryTag).toBeTruthy();
    expect(countryTag?.textContent).toContain('Venezuela');
  });

  it('debe cargar los años de nacimiento disponibles en ngOnInit (TS-49)', () => {
    expect(directoryServiceSpy.getAvailableBirthYears).toHaveBeenCalled();
    expect(component.availableBirthYears()).toEqual([2012, 2011, 2010, 2009, 2008]);
  });

  it('debe filtrar por rango de años y deseleccionar categoría rápida (TS-49)', () => {
    component.selectedBirthYear.set(2011);
    component.onYearFromChange(2009);
    component.onYearToChange(2011);

    expect(component.selectedBirthYear()).toBeNull();
    expect(component.selectedBirthYearFrom()).toBe(2009);
    expect(component.selectedBirthYearTo()).toBe(2011);
    expect(directoryServiceSpy.getDirectory).toHaveBeenCalledWith(jasmine.objectContaining({
      birthYear: null,
      birthYearFrom: 2009,
      birthYearTo: 2011,
      page: 0
    }));
  });

  it('debe reiniciar los selectores de rango al seleccionar un chip de categoría (TS-49)', () => {
    component.selectedBirthYearFrom.set(2009);
    component.selectedBirthYearTo.set(2011);

    component.selectCategory(2011);

    expect(component.selectedBirthYear()).toBe(2011);
    expect(component.selectedBirthYearFrom()).toBeNull();
    expect(component.selectedBirthYearTo()).toBeNull();
    expect(directoryServiceSpy.getDirectory).toHaveBeenCalledWith(jasmine.objectContaining({
      birthYear: 2011,
      birthYearFrom: null,
      birthYearTo: null,
      page: 0
    }));
  });

  it('debe limpiar los selectores de rango de año al ejecutar resetFilters (TS-49)', () => {
    component.selectedBirthYearFrom.set(2008);
    component.selectedBirthYearTo.set(2010);
    component.resetFilters();

    expect(component.selectedBirthYearFrom()).toBeNull();
    expect(component.selectedBirthYearTo()).toBeNull();
    expect(component.selectedBirthYear()).toBeNull();
    expect(directoryServiceSpy.getDirectory).toHaveBeenCalledWith(jasmine.objectContaining({
      birthYear: null,
      birthYearFrom: null,
      birthYearTo: null,
      page: 0
    }));
  });
});
