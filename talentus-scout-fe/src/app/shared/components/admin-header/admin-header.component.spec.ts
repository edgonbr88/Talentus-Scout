import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminHeaderComponent } from './admin-header.component';

@Component({
  standalone: true,
  imports: [AdminHeaderComponent],
  template: `
    <app-admin-header [title]="title" [subtitle]="subtitle" [badgeText]="badgeText">
      <button actions id="test-action-btn">Acción Local</button>
    </app-admin-header>
  `
})
class TestHostComponent {
  title = 'Título de Prueba';
  subtitle = 'Subtítulo explicativo de prueba';
  badgeText = 'SALVAGUARDA LOPNNA & FIFA';
}

describe('AdminHeaderComponent', () => {
  let hostComponent: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminHeaderComponent, TestHostComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the admin header component', () => {
    const headerEl = fixture.nativeElement.querySelector('app-admin-header');
    expect(headerEl).toBeTruthy();
  });

  it('should render the title and subtitle accurately', () => {
    const el = fixture.nativeElement as HTMLElement;
    const titleEl = el.querySelector('.admin-title');
    const subtitleEl = el.querySelector('.admin-subtitle');

    expect(titleEl?.textContent?.trim()).toBe('Título de Prueba');
    expect(subtitleEl?.textContent?.trim()).toBe('Subtítulo explicativo de prueba');
  });

  it('should render default admin badge and contextual badge', () => {
    const el = fixture.nativeElement as HTMLElement;
    const adminBadge = el.querySelector('.badge-admin');
    const verifiedBadge = el.querySelector('.badge-verified');

    expect(adminBadge?.textContent?.trim()).toBe('PANEL ADMINISTRATIVO');
    expect(verifiedBadge?.textContent?.trim()).toBe('SALVAGUARDA LOPNNA & FIFA');
  });

  it('should render exactly 4 navigation pills in the standardized order', () => {
    const el = fixture.nativeElement as HTMLElement;
    const pills = el.querySelectorAll('.subnav-pill');

    expect(pills.length).toBe(4);

    const expectedModules = [
      { label: 'Auditoría Scouts', route: '/admin/scouts', icon: '🕵️‍♂️' },
      { label: 'Patria Potestad', route: '/admin/verificacion-legal', icon: '⚖️' },
      { label: 'Auditoría Pagos', route: '/admin/pagos', icon: '💳' },
      { label: 'Clubes y Academias', route: '/admin/clubes', icon: '🛡️' }
    ];

    pills.forEach((pill, index) => {
      const exp = expectedModules[index];
      const iconSpan = pill.querySelector('.pill-icon');
      const labelSpan = pill.querySelector('.pill-label');
      const href = pill.getAttribute('href');

      expect(iconSpan?.textContent?.trim()).toBe(exp.icon);
      expect(labelSpan?.textContent?.trim()).toBe(exp.label);
      expect(href).toBe(exp.route);
    });
  });

  it('should project local actions into the actions slot', () => {
    const el = fixture.nativeElement as HTMLElement;
    const projectedBtn = el.querySelector('#test-action-btn');

    expect(projectedBtn).toBeTruthy();
    expect(projectedBtn?.textContent?.trim()).toBe('Acción Local');
  });
});
