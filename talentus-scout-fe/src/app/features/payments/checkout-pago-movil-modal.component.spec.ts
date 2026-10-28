import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { CheckoutPagoMovilModalComponent } from './checkout-pago-movil-modal.component';
import { PaymentService } from '../../core/services/payment.service';
import { AthleteSummary } from '../../core/models/athlete.model';
import {
  BcvRateResponse,
  PaymentConfigResponse,
  PaymentTransactionResponse,
  ValidateCouponResponse
} from '../../core/models/payment.model';

describe('CheckoutPagoMovilModalComponent - TS-44 Validación y Envío de amountVes', () => {
  let component: CheckoutPagoMovilModalComponent;
  let fixture: ComponentFixture<CheckoutPagoMovilModalComponent>;
  let paymentServiceSpy: jasmine.SpyObj<PaymentService>;

  const mockAthlete: AthleteSummary = {
    id: 'ath-123-uuid',
    firstName: 'Mateo',
    lastName: 'Arango',
    fullName: 'Mateo Arango',
    birthDate: '2010-05-20',
    age: 16,
    primaryPosition: 'Mediocampista',
    preferredFoot: 'Derecha',
    slug: 'mateo-arango',
    isPublic: true,
    subscriptionStatus: 'INACTIVE',
    hasIdentityDocument: true,
    legalVerificationStatus: 'APPROVED'
  };

  const mockConfig: PaymentConfigResponse = {
    recipientBank: 'Banco de Venezuela',
    recipientPhone: '04141234567',
    recipientIdDocument: 'V-20123456',
    recipientAccountHolder: 'Talentus Scout C.A.',
    binancePayId: '283918273',
    binanceWalletAddress: 'TLsV5289FjK93kdJ8193jd93kd9',
    binanceNetwork: 'USDT (TRC-20 / BEP-20)',
    binanceQrImageUrl: '/assets/images/binance-qr-sample.png',
    plans: [
      {
        id: 'PRO_MONTHLY',
        name: 'Plan Pro Mensual',
        description: 'Visibilidad completa en directorio',
        priceUsd: 5.00,
        durationDays: 30,
        isActive: true
      },
      {
        id: 'PRO_ANNUAL',
        name: 'Plan Pro Anual',
        description: 'Visibilidad completa anual con descuento',
        priceUsd: 45.00,
        durationDays: 365,
        isActive: true
      }
    ]
  };

  const mockBcvRate: BcvRateResponse = {
    officialRate: 45.50,
    date: '2026-10-19',
    source: 'BCV_SCRAPER',
    cached: true
  };

  const mockTransactionResponse: PaymentTransactionResponse = {
    id: 'tx-999-uuid',
    athleteId: 'ath-123-uuid',
    athleteName: 'Mateo Arango',
    planId: 'PRO_MONTHLY',
    planName: 'Plan Pro Mensual',
    method: 'PAGO_MOVIL',
    amountUsd: 5.00,
    amountVes: 227.50,
    bcvExchangeRate: 45.50,
    referenceNumber: '009988',
    paymentDate: '2026-10-19',
    status: 'PENDING_AUDIT',
    createdAt: new Date().toISOString()
  };

  beforeEach(async () => {
    paymentServiceSpy = jasmine.createSpyObj('PaymentService', [
      'getPaymentConfig',
      'getBcvRate',
      'reportPagoMovil',
      'reportBinanceManual',
      'validateCoupon',
      'redeemFreePromo',
      'createBinanceOrder',
      'getAthleteSubscriptionStatus'
    ]);

    paymentServiceSpy.getPaymentConfig.and.returnValue(of(mockConfig));
    paymentServiceSpy.getBcvRate.and.returnValue(of(mockBcvRate));

    await TestBed.configureTestingModule({
      imports: [CheckoutPagoMovilModalComponent],
      providers: [
        { provide: PaymentService, useValue: paymentServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CheckoutPagoMovilModalComponent);
    component = fixture.componentInstance;
    component.athlete = mockAthlete;
    fixture.detectChanges();
  });

  it('debe crearse e inicializar el plan por defecto y la tasa oficial BCV', () => {
    expect(component).toBeTruthy();
    expect(component.selectedPlan()?.id).toBe('PRO_MONTHLY');
    expect(component.bcvRate()?.officialRate).toBe(45.50);
    expect(component.isLoading()).toBeFalse();
  });

  it('debe calcular correctamente calculatedAmountVes multiplicando precio USD por la tasa BCV', () => {
    // 5.00 USD * 45.50 = 227.50 VES
    expect(component.effectiveAmountUsd).toBe(5.00);
    expect(component.calculatedAmountVes).toBe(227.50);
  });

  it('debe despachar submitReport() incluyendo amountVes y bcvRate en el payload (doble blindaje TS-44)', () => {
    paymentServiceSpy.reportPagoMovil.and.returnValue(of(mockTransactionResponse));
    spyOn(component.paymentReported, 'emit');

    component.referenceNumber = '009988';
    component.paymentDate = '2026-10-19';
    component.originBank = 'Banesco';
    component.originPhone = '04149876543';

    component.submitReport();

    expect(paymentServiceSpy.reportPagoMovil).toHaveBeenCalledTimes(1);
    const sentPayload = paymentServiceSpy.reportPagoMovil.calls.mostRecent().args[0];

    expect(sentPayload.athleteId).toBe('ath-123-uuid');
    expect(sentPayload.planId).toBe('PRO_MONTHLY');
    expect(sentPayload.referenceNumber).toBe('009988');
    expect(sentPayload.amountVes).toBe(227.50);
    expect(sentPayload.bcvRate).toBe(45.50);
    expect(sentPayload.originBank).toBe('Banesco');
    expect(sentPayload.originPhone).toBe('04149876543');

    expect(component.paymentReported.emit).toHaveBeenCalledWith(mockTransactionResponse);
    expect(component.isSubmitting()).toBeFalse();
  });

  it('debe enviar amountVes con descuento aplicado cuando hay un cupón activo', () => {
    const couponResponse: ValidateCouponResponse = {
      valid: true,
      message: 'Descuento 20% aplicado',
      code: 'DESCUENTO20',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      originalAmountUsd: 5.00,
      discountAmountUsd: 1.00,
      finalAmountUsd: 4.00,
      finalAmountVes: 182.00,
      isFreePromo: false
    };

    component.appliedCoupon.set(couponResponse);
    expect(component.effectiveAmountUsd).toBe(4.00);
    expect(component.calculatedAmountVes).toBe(182.00);

    paymentServiceSpy.reportPagoMovil.and.returnValue(of({
      ...mockTransactionResponse,
      amountUsd: 4.00,
      amountVes: 182.00,
      discountCode: 'DESCUENTO20'
    }));

    component.referenceNumber = '554433';
    component.paymentDate = '2026-10-19';
    component.submitReport();

    expect(paymentServiceSpy.reportPagoMovil).toHaveBeenCalledTimes(1);
    const sentPayload = paymentServiceSpy.reportPagoMovil.calls.mostRecent().args[0];

    expect(sentPayload.amountVes).toBe(182.00);
    expect(sentPayload.bcvRate).toBe(45.50);
    expect(sentPayload.discountCode).toBe('DESCUENTO20');
  });

  it('debe validar que el número de referencia tenga al menos 4 caracteres antes de enviar', () => {
    component.referenceNumber = '12';
    component.submitReport();

    expect(paymentServiceSpy.reportPagoMovil).not.toHaveBeenCalled();
    expect(component.errorMessage()).toContain('número de referencia bancaria válido');
  });

  it('debe emitir close cuando el usuario cierra el modal', () => {
    spyOn(component.close, 'emit');
    component.closeModal();
    expect(component.close.emit).toHaveBeenCalled();
  });

  it('debe cambiar al método BINANCE_PAY y renderizar los datos oficiales de billetera', () => {
    component.setMethod('BINANCE_PAY');
    fixture.detectChanges();

    expect(component.selectedMethod()).toBe('BINANCE_PAY');
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('283918273');
    expect(compiled.textContent).toContain('TLsV5289FjK93kdJ8193jd93kd9');
    expect(compiled.textContent).toContain('USDT (TRC-20 / BEP-20)');
  });

  it('debe despachar submitBinanceReport() hacia PaymentService con los datos del formulario', () => {
    const mockBinanceTx: PaymentTransactionResponse = {
      ...mockTransactionResponse,
      method: 'BINANCE_PAY',
      referenceNumber: 'BINANCE-TX-9988',
      amountVes: 0,
      bcvExchangeRate: 0
    };

    paymentServiceSpy.reportBinanceManual.and.returnValue(of(mockBinanceTx));
    spyOn(component.paymentReported, 'emit');

    component.setMethod('BINANCE_PAY');
    component.binanceReference = 'BINANCE-TX-9988';
    component.binancePaymentDate = '2026-10-21';
    component.binanceOriginAccount = '@tutor_crypto';

    component.submitBinanceReport();

    expect(paymentServiceSpy.reportBinanceManual).toHaveBeenCalledTimes(1);
    const payload = paymentServiceSpy.reportBinanceManual.calls.mostRecent().args[0];

    expect(payload.athleteId).toBe('ath-123-uuid');
    expect(payload.planId).toBe('PRO_MONTHLY');
    expect(payload.referenceNumber).toBe('BINANCE-TX-9988');
    expect(payload.paymentDate).toBe('2026-10-21');
    expect(payload.originAccount).toBe('@tutor_crypto');

    expect(component.paymentReported.emit).toHaveBeenCalledWith(mockBinanceTx);
    expect(component.isSubmittingBinance()).toBeFalse();
  });

  it('debe validar que la referencia de Binance tenga al menos 4 caracteres', () => {
    component.binanceReference = 'abc';
    component.submitBinanceReport();

    expect(paymentServiceSpy.reportBinanceManual).not.toHaveBeenCalled();
    expect(component.errorMessage()).toContain('mínimo 4 caracteres');
  });
});
