import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BrandLogoComponent } from './brand-logo.component';

describe('BrandLogoComponent', () => {
  let component: BrandLogoComponent;
  let fixture: ComponentFixture<BrandLogoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrandLogoComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(BrandLogoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the brand logo component', () => {
    expect(component).toBeTruthy();
  });

  it('should generate default logoSrc for imagotipo and color', () => {
    expect(component.logoSrc).toBe('/assets/branding/ts-imagotipo-color.svg');
  });

  it('should generate proper logoSrc when variant and theme change', () => {
    component.variant = 'isotipo';
    component.theme = 'negativo';
    expect(component.logoSrc).toBe('/assets/branding/ts-isotipo-negativo.svg');

    component.variant = 'logotipo';
    component.theme = 'positivo';
    expect(component.logoSrc).toBe('/assets/branding/ts-logotipo-positivo.svg');

    component.variant = 'imagotipo';
    component.theme = 'dark';
    expect(component.logoSrc).toBe('/assets/branding/ts-imagotipo-dark.svg');
  });

  it('should render link when clickable is true', () => {
    component.clickable = true;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const link = compiled.querySelector('a.brand-logo-link');
    expect(link).toBeTruthy();
  });

  it('should render wrapper div when clickable is false', () => {
    component.clickable = false;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const wrapper = compiled.querySelector('div.brand-logo-wrapper');
    expect(wrapper).toBeTruthy();
    expect(compiled.querySelector('a.brand-logo-link')).toBeNull();
  });
});
