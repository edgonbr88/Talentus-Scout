import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScoutTermsModalComponent } from './scout-terms-modal.component';

describe('ScoutTermsModalComponent', () => {
  let component: ScoutTermsModalComponent;
  let fixture: ComponentFixture<ScoutTermsModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScoutTermsModalComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ScoutTermsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse el componente', () => {
    expect(component).toBeTruthy();
  });

  it('no debe renderizar el modal si isOpen es false', () => {
    component.isOpen = false;
    fixture.detectChanges();
    const modalElement = fixture.nativeElement.querySelector('.modal-backdrop');
    expect(modalElement).toBeNull();
  });

  it('debe renderizar el modal con los 4 pilares si isOpen es true', () => {
    component.isOpen = true;
    fixture.detectChanges();
    const modalElement = fixture.nativeElement.querySelector('.modal-backdrop');
    expect(modalElement).toBeTruthy();

    const titleElement = fixture.nativeElement.querySelector('#terms-modal-title');
    expect(titleElement.textContent).toContain('Términos y Condiciones para Scouts');

    const bentoCards = fixture.nativeElement.querySelectorAll('.bento-card');
    expect(bentoCards.length).toBe(4);
  });

  it('debe emitir closeModal al hacer clic en cerrar o en el backdrop', () => {
    spyOn(component.closeModal, 'emit');
    component.isOpen = true;
    fixture.detectChanges();

    const closeBtn = fixture.nativeElement.querySelector('.btn-close-modal');
    closeBtn.click();
    expect(component.closeModal.emit).toHaveBeenCalledTimes(1);

    const backdrop = fixture.nativeElement.querySelector('.modal-backdrop');
    backdrop.click();
    expect(component.closeModal.emit).toHaveBeenCalledTimes(2);
  });

  it('debe emitir acceptTerms al hacer clic en el botón de aceptar', () => {
    spyOn(component.acceptTerms, 'emit');
    component.isOpen = true;
    fixture.detectChanges();

    const acceptBtn = fixture.nativeElement.querySelector('.btn-accept');
    acceptBtn.click();
    expect(component.acceptTerms.emit).toHaveBeenCalled();
  });
});
