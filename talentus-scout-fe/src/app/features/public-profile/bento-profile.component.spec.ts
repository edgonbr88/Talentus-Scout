import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BentoProfileComponent } from './bento-profile.component';
import { AthleteService } from '../../core/services/athlete.service';
import { SeoService } from '../../core/services/seo.service';
import { AuthService } from '../../core/auth/auth.service';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { PublicAthleteResponse } from '../../core/models/athlete.model';

import { ScoutDirectoryService } from '../../core/services/scout-directory.service';

describe('BentoProfileComponent', () => {
  let component: BentoProfileComponent;
  let fixture: ComponentFixture<BentoProfileComponent>;
  let athleteServiceSpy: jasmine.SpyObj<AthleteService>;
  let seoServiceSpy: jasmine.SpyObj<SeoService>;
  let scoutDirectoryServiceSpy: jasmine.SpyObj<ScoutDirectoryService>;
  let authServiceSpy: any;

  const mockAthlete: PublicAthleteResponse = {
    id: 'test-uuid-001',
    slug: 'gabriel-perez-10',
    firstName: 'Gabriel',
    lastName: 'Pérez',
    fullName: 'Gabriel Pérez',
    age: 16,
    birthDate: '2010-06-15',
    gender: 'MALE',
    primaryPosition: 'Delantero Centro',
    secondaryPosition: 'Extremo Derecho',
    preferredFoot: 'Derecho',
    nationality: 'Venezolana',
    secondaryPassports: 'Español (UE)',
    club: {
      name: 'Deportivo Miranda Sub-16',
      city: 'Caracas',
      state: 'Miranda'
    },
    metrics: {
      heightCm: 174.5,
      weightKg: 63.0
    },
    badges: [
      {
        type: 'FEDERATION_LICENSE',
        title: 'Licencia Oficial FVF',
        verified: true,
        organizationName: 'Federación Venezolana de Fútbol'
      }
    ],
    videos: [
      {
        id: 'vid-01',
        title: 'Goles Clausura',
        category: 'HIGHLIGHTS',
        playbackUrl: 'https://cdn.talentus.app/videos/test.m3u8'
      }
    ]
  };

  beforeEach(async () => {
    athleteServiceSpy = jasmine.createSpyObj('AthleteService', ['getPublicAthleteBySlug', 'downloadAthleteCvPdf']);
    seoServiceSpy = jasmine.createSpyObj('SeoService', ['setAthleteProfileMeta']);
    scoutDirectoryServiceSpy = jasmine.createSpyObj('ScoutDirectoryService', ['logAthleteView', 'contactAthleteTutor']);
    scoutDirectoryServiceSpy.logAthleteView.and.returnValue(of(null as any));
    scoutDirectoryServiceSpy.contactAthleteTutor.and.returnValue(of({ whatsappUrl: 'https://wa.me/test' } as any));
    authServiceSpy = {
      isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(false),
      currentUser: jasmine.createSpy('currentUser').and.returnValue(null)
    };

    athleteServiceSpy.getPublicAthleteBySlug.and.returnValue(of(mockAthlete));

    await TestBed.configureTestingModule({
      imports: [BentoProfileComponent],
      providers: [
        { provide: AthleteService, useValue: athleteServiceSpy },
        { provide: SeoService, useValue: seoServiceSpy },
        { provide: ScoutDirectoryService, useValue: scoutDirectoryServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(new Map([['slug', 'gabriel-perez-10']]))
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BentoProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load athlete data', () => {
    expect(component).toBeTruthy();
    expect(component.athlete()).toEqual(mockAthlete);
    expect(seoServiceSpy.setAthleteProfileMeta).toHaveBeenCalledWith(mockAthlete);
  });

  it('should render athlete name, club and metrics in Bento Grid', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.athlete-name')?.textContent).toContain('Gabriel Pérez');
    expect(compiled.querySelector('.pill-primary-position')?.textContent).toContain('Delantero Centro');
    expect(compiled.querySelector('.club-name')?.textContent).toContain('Deportivo Miranda Sub-16');
    expect(compiled.textContent).toContain('174.5 cm');
    expect(compiled.textContent).toContain('63 kg');
  });

  it('should display verified badges, whatsapp button and cv pdf button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.badge-name')?.textContent).toContain('Licencia Oficial FVF');
    expect(compiled.querySelector('.btn-whatsapp-action')).toBeTruthy();
    expect(compiled.querySelector('.btn-pdf-dock')).toBeTruthy();
  });

  it('should show auth prompt modal when unauthenticated user clicks download CV', () => {
    component.downloadCvPdf();
    expect(component.showAuthPrompt()).toBeTrue();
  });
});

