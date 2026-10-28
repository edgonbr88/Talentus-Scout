import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LandingComponent } from './landing.component';
import { provideRouter } from '@angular/router';

describe('LandingComponent (TS-25)', () => {
  let component: LandingComponent;
  let fixture: ComponentFixture<LandingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(LandingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the landing component', () => {
    expect(component).toBeTruthy();
  });

  it('should render the hero background video with proper attributes and poster', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const video = compiled.querySelector('.hero-bg-video') as HTMLVideoElement;
    expect(video).toBeTruthy();
    expect(video.getAttribute('poster')).toContain('assets/videos/hero-soccer-poster.webp');
    expect(video.hasAttribute('autoplay')).toBeTrue();
    expect(video.hasAttribute('muted')).toBeTrue();
    expect(video.hasAttribute('loop')).toBeTrue();
    expect(video.hasAttribute('playsinline')).toBeTrue();
  });

  it('should contain sources for both WebM and MP4 video formats', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const sources = compiled.querySelectorAll('.hero-bg-video source');
    expect(sources.length).toBe(2);

    const webmSrc = sources[0].getAttribute('src');
    const webmType = sources[0].getAttribute('type');
    expect(webmSrc).toContain('assets/videos/hero-soccer-loop.webm');
    expect(webmType).toBe('video/webm');

    const mp4Src = sources[1].getAttribute('src');
    const mp4Type = sources[1].getAttribute('type');
    expect(mp4Src).toContain('assets/videos/hero-soccer-loop.mp4');
    expect(mp4Type).toBe('video/mp4');
  });

  it('should render the hero background contrast overlay', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const overlay = compiled.querySelector('.hero-bg-overlay');
    expect(overlay).toBeTruthy();
  });

  it('should display the approved motivational motto', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const motto = compiled.querySelector('.hero-motto');
    expect(motto).toBeTruthy();
    expect(motto?.textContent).toContain('Tu disciplina en la cancha, visible para los mejores scouts.');
  });

  it('should not contain the acronym LOPNNA in visible text', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).not.toContain('LOPNNA');
  });

  describe('Official Community and Contact Channels (TS-57)', () => {
    it('should render the community and contact section with Instagram and email cards', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const section = compiled.querySelector('.community-section');
      expect(section).toBeTruthy();

      const instagramCard = compiled.querySelector('.instagram-card');
      const mailCard = compiled.querySelector('.mail-card');
      expect(instagramCard).toBeTruthy();
      expect(mailCard).toBeTruthy();
    });

    it('should link to the official Instagram profile securely with noopener noreferrer', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const instaLink = compiled.querySelector('.btn-outline-instagram') as HTMLAnchorElement;
      expect(instaLink).toBeTruthy();
      expect(instaLink.getAttribute('href')).toBe('https://www.instagram.com/talentusscout/');
      expect(instaLink.getAttribute('target')).toBe('_blank');
      expect(instaLink.getAttribute('rel')).toContain('noopener');
      expect(instaLink.getAttribute('rel')).toContain('noreferrer');
    });

    it('should display the official email and provide mailto link', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const emailCode = compiled.querySelector('.email-text');
      expect(emailCode?.textContent?.trim()).toBe('contacto@talentusscout.com');

      const mailtoLink = compiled.querySelector('.mail-actions a.btn-primary') as HTMLAnchorElement;
      expect(mailtoLink).toBeTruthy();
      expect(mailtoLink.getAttribute('href')).toBe('mailto:contacto@talentusscout.com');
    });

    it('should trigger emailCopied signal when copyEmail is invoked', async () => {
      if (navigator.clipboard) {
        spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());
      }
      expect(component.emailCopied()).toBeFalse();
      component.copyEmail();
      await fixture.whenStable();
      expect(component.emailCopied()).toBeTrue();
    });
  });
});
