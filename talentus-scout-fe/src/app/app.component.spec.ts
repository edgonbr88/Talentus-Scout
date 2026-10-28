import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideHttpClient(),
        provideRouter([])
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have the 'talentus-scout-fe' title`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('talentus-scout-fe');
  });

  it('should render brand logo in footer', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const brandLogo = compiled.querySelector('.footer-brand app-brand-logo');
    expect(brandLogo).toBeTruthy();
  });

  it('should render official channels and links in global footer', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    const instaLink = compiled.querySelector('.footer-channels a[href="https://www.instagram.com/talentusscout/"]') as HTMLAnchorElement;
    expect(instaLink).toBeTruthy();
    expect(instaLink.getAttribute('target')).toBe('_blank');
    expect(instaLink.getAttribute('rel')).toContain('noopener');

    const emailLink = compiled.querySelector('.footer-channels a[href="mailto:contacto@talentusscout.com"]') as HTMLAnchorElement;
    expect(emailLink).toBeTruthy();

    const legalCol = compiled.querySelector('.footer-legal');
    expect(legalCol?.textContent).toContain('LOPNNA Art. 65');
  });
});
