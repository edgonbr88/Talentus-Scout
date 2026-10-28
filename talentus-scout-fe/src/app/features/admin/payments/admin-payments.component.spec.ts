import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';
import { AdminPaymentsComponent } from './admin-payments.component';
import { PaymentService } from '../../../core/services/payment.service';
import { PaymentGatewaySettingsDto } from '../../../core/models/payment.model';

describe('AdminPaymentsComponent (TS-58) - Mantenedor de Cuentas de Cobro', () => {
  let component: AdminPaymentsComponent;
  let fixture: ComponentFixture<AdminPaymentsComponent>;
  let paymentServiceSpy: jasmine.SpyObj<PaymentService>;

  const mockGatewaySettings: PaymentGatewaySettingsDto = {
    id: 'gateway-settings-uuid-1',
    pagoMovilEnabled: true,
    pagoMovilBank: 'Banco Nacional de Crédito (BNC)',
    pagoMovilPhone: '04141234567',
    pagoMovilIdNumber: 'J-50123456-7',
    pagoMovilAccountHolder: 'Talentus Scout C.A.',
    binanceManualEnabled: true,
    binancePayId: '283918273',
    binanceWalletAddress: 'TLsV5289FjK93kdJ8193jd93kd9',
    binanceNetwork: 'USDT (TRC-20 / BEP-20)',
    binanceQrImageUrl: '/assets/images/binance-qr-sample.png',
    updatedAt: new Date().toISOString()
  };

  beforeEach(async () => {
    paymentServiceSpy = jasmine.createSpyObj('PaymentService', [
      'getAdminPaymentSummary',
      'getPendingPayments',
      'getAdminPaymentHistory',
      'getAdminDiscountCodes',
      'getClubs',
      'getPaymentGatewaySettings',
      'updatePaymentGatewaySettings',
      'uploadBinanceQrImage'
    ]);

    paymentServiceSpy.getAdminPaymentSummary.and.returnValue(of({
      totalRevenueUsd: 1500,
      totalRevenueVes: 120000,
      pagoMovilApprovedCount: 30,
      binancePayApprovedCount: 20,
      approvedCount: 50,
      rejectedCount: 2,
      pendingCount: 0,
      pendingAuditCount: 0
    }));

    paymentServiceSpy.getPendingPayments.and.returnValue(of([]));
    paymentServiceSpy.getPaymentGatewaySettings.and.returnValue(of(mockGatewaySettings));

    await TestBed.configureTestingModule({
      imports: [AdminPaymentsComponent],
      providers: [
        { provide: PaymentService, useValue: paymentServiceSpy },
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminPaymentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the admin payments component', () => {
    expect(component).toBeTruthy();
  });

  it('should load gateway settings on initialization', () => {
    expect(paymentServiceSpy.getPaymentGatewaySettings).toHaveBeenCalled();
    expect(component.gatewaySettings()).toEqual(mockGatewaySettings);
    expect(component.pmBankInput).toBe('Banco Nacional de Crédito (BNC)');
    expect(component.pmPhoneInput).toBe('04141234567');
    expect(component.pmIdNumberInput).toBe('J-50123456-7');
    expect(component.binancePayIdInput).toBe('283918273');
    expect(component.binanceWalletInput).toBe('TLsV5289FjK93kdJ8193jd93kd9');
  });

  it('should switch active tab to GATEWAY_SETTINGS', () => {
    component.setTab('GATEWAY_SETTINGS');
    expect(component.activeTab()).toBe('GATEWAY_SETTINGS');
  });

  it('should render the Cuentas de Cobro tab button and section', () => {
    component.setTab('GATEWAY_SETTINGS');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const tabBtn = compiled.querySelector('.admin-tabs-nav button:nth-child(4)');
    expect(tabBtn?.textContent).toContain('Cuentas de Cobro');

    const configCards = compiled.querySelectorAll('.bento-config-card');
    expect(configCards.length).toBe(2); // Pago Móvil card and Binance card
  });

  it('should update gateway settings successfully when form is submitted', () => {
    const updatedDto: PaymentGatewaySettingsDto = {
      ...mockGatewaySettings,
      pagoMovilBank: 'Banco Mercantil',
      pagoMovilPhone: '04241112233'
    };
    paymentServiceSpy.updatePaymentGatewaySettings.and.returnValue(of(updatedDto));

    component.pmBankInput = 'Banco Mercantil';
    component.pmPhoneInput = '04241112233';
    component.saveGatewaySettings();

    expect(paymentServiceSpy.updatePaymentGatewaySettings).toHaveBeenCalledWith(jasmine.objectContaining({
      pagoMovilBank: 'Banco Mercantil',
      pagoMovilPhone: '04241112233'
    }));
    expect(component.gatewaySettings()?.pagoMovilBank).toBe('Banco Mercantil');
    expect(component.feedback()?.type).toBe('success');
  });

  it('should upload binance QR code and update preview url', () => {
    paymentServiceSpy.uploadBinanceQrImage.and.returnValue(of({ qrImageUrl: '/uploads/payments/new-qr.png' }));

    const mockFile = new File(['mock content'], 'qr.png', { type: 'image/png' });
    component.selectedQrFile = mockFile;

    component.uploadSelectedQr();

    expect(paymentServiceSpy.uploadBinanceQrImage).toHaveBeenCalledWith(mockFile);
    expect(component.binanceQrImageUrlDisplay()).toBe('/uploads/payments/new-qr.png');
    expect(component.selectedQrFile).toBeNull();
    expect(component.feedback()?.type).toBe('success');
  });
});
