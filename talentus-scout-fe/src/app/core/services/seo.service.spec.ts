import { TestBed } from '@angular/core/testing';
import { SeoService } from './seo.service';
import { Meta, Title } from '@angular/platform-browser';
import { PublicAthleteResponse } from '../models/athlete.model';

describe('SeoService', () => {
  let service: SeoService;
  let titleService: Title;
  let metaService: Meta;

  const mockAthlete: PublicAthleteResponse = {
    id: 'b1-test',
    slug: 'gabriel-perez-10',
    firstName: 'Gabriel',
    lastName: 'Pérez',
    fullName: 'Gabriel Pérez',
    age: 16,
    birthDate: '2010-06-15',
    gender: 'MALE',
    primaryPosition: 'Delantero Centro',
    preferredFoot: 'Derecho',
    nationality: 'Venezolana',
    profilePhotoUrl: 'https://cdn.talentus.app/photos/gabriel.jpg',
    club: {
      name: 'Deportivo Miranda Sub-16',
      city: 'Caracas',
      state: 'Miranda'
    },
    badges: [],
    videos: []
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SeoService, Title, Meta]
    });
    service = TestBed.inject(SeoService);
    titleService = TestBed.inject(Title);
    metaService = TestBed.inject(Meta);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should set Open Graph title, description and image', () => {
    service.setAthleteProfileMeta(mockAthlete);

    expect(titleService.getTitle()).toContain('Gabriel Pérez (2010)');
    expect(titleService.getTitle()).toContain('Delantero Centro');

    const ogTitle = metaService.getTag('property="og:title"');
    expect(ogTitle?.content).toContain('Gabriel Pérez — Delantero Centro');

    const ogImage = metaService.getTag('property="og:image"');
    expect(ogImage?.content).toBe('https://cdn.talentus.app/photos/gabriel.jpg');

    const ogUrl = metaService.getTag('property="og:url"');
    expect(ogUrl?.content).toContain('/atleta/gabriel-perez-10');

    const twitterCard = metaService.getTag('name="twitter:card"');
    expect(twitterCard?.content).toBe('summary_large_image');
  });
});
