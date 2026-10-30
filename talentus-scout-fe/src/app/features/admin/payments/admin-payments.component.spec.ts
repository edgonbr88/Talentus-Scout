import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';
import { AdminPaymentsComponent } from './admin-payments.component';
import { PaymentService } from '../../../core/services/payment.service';
import { PaymentGatewaySettingsDto, SubscriptionPlanAdminDto } from '../../../core/models/payment.model';

describe('AdminPaymentsComponent - Auditoría y Configuración de Pagos', () => {
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

  const mockPlans: SubscriptionPlanAdminDto[] = [
    {
      id: 'PRO_MONTHLY',
      name: 'Plan Pro Mensual',
      priceUsd: 5.00,
      durationDays: 30,
      maxVideos: 5,
      hasRadarViews: true,
      hasPdfCv: true,
      isActive: true,
      activeSubscribersCount: 12
    },
    {
      id: 'PRO_ANNUAL',
      name: 'Plan Pro Anual',
      priceUsd: 50.00,
      durationDays: 365,
      maxVideos: 10,
      hasRadarViews: true,
      hasPdfCv: true,
      isActive: true,
      activeSubscribersCount: 8
    }
  ];

  beforeEach(async () => {
    paymentServiceSpy = jasmine.createSpyObj('PaymentService', [
      'getAdminPaymentSummary',
      'getPendingPayments',
      'getAdminPaymentHistory',
      'getAdminDiscountCodes',
      'getClubs',
      'getPaymentGatewaySettings',
      'updatePaymentGatewaySettings',
      'uploadBinanceQrImage',
      'getAdminSubscriptionPlans',
      'getAdminSubscriptionPlanById',
      'createSubscriptionPlan',
      'updateSubscriptionPlan',
      'toggleSubscriptionPlanStatus'
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
    paymentServiceSpy.getAdminSubscriptionPlans.and.returnValue(of(mockPlans));

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

  it('should load gateway settings and subscription plans on initialization', () => {
    expect(paymentServiceSpy.getPaymentGatewaySettings).toHaveBeenCalled();
    expect(paymentServiceSpy.getAdminSubscriptionPlans).toHaveBeenCalled();
    expect(component.gatewaySettings()).toEqual(mockGatewaySettings);
    expect(component.subscriptionPlans()).toEqual(mockPlans);
    expect(component.getActivePlansCount()).toBe(2);
  });

  it('should switch active tab to PLANS_CONFIG', () => {
    component.setTab('PLANS_CONFIG');
    expect(component.activeTab()).toBe('PLANS_CONFIG');
  });

  it('should render the Planes y Precios tab button and section', () => {
    component.setTab('PLANS_CONFIG');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const tabButtons = compiled.querySelectorAll('.admin-tabs-nav button');
    const plansTabBtn = Array.from(tabButtons).find(btn => btn.textContent?.includes('Planes y Precios'));
    expect(plansTabBtn).toBeTruthy();

    const planCards = compiled.querySelectorAll('.bento-plan-card');
    expect(planCards.length).toBe(2);
  });

  it('should open modal for creating a new plan', () => {
    component.openCreatePlanModal();
    expect(component.isPlanModalOpen()).toBeTrue();
    expect(component.editingPlanId()).toBeNull();
    expect(component.planIdInput).toBe('');
    expect(component.planNameInput).toBe('');
  });

  it('should open modal for editing an existing plan', () => {
    component.openEditPlanModal(mockPlans[0]);
    expect(component.isPlanModalOpen()).toBeTrue();
    expect(component.editingPlanId()).toBe('PRO_MONTHLY');
    expect(component.planIdInput).toBe('PRO_MONTHLY');
    expect(component.planNameInput).toBe('Plan Pro Mensual');
    expect(component.planPriceUsdInput).toBe(5.00);
  });

  it('should create a new subscription plan successfully', () => {
    const newPlan: SubscriptionPlanAdminDto = {
      id: 'PRO_SEMESTRAL',
      name: 'Plan Semestral',
      priceUsd: 25.00,
      durationDays: 180,
      maxVideos: 8,
      hasRadarViews: true,
      hasPdfCv: true,
      isActive: true
    };
    paymentServiceSpy.createSubscriptionPlan.and.returnValue(of(newPlan));

    component.openCreatePlanModal();
    component.planIdInput = 'PRO_SEMESTRAL';
    component.planNameInput = 'Plan Semestral';
    component.planPriceUsdInput = 25.00;
    component.planDurationDaysInput = 180;
    component.planMaxVideosInput = 8;
    component.planHasRadarViewsInput = true;
    component.planHasPdfCvInput = true;

    component.savePlan();

    expect(paymentServiceSpy.createSubscriptionPlan).toHaveBeenCalledWith(jasmine.objectContaining({
      id: 'PRO_SEMESTRAL',
      name: 'Plan Semestral',
      priceUsd: 25.00,
      durationDays: 180
    }));
    expect(component.isPlanModalOpen()).toBeFalse();
    expect(component.feedback()?.type).toBe('success');
  });

  it('should toggle subscription plan status', () => {
    const updatedPlan: SubscriptionPlanAdminDto = {
      ...mockPlans[1],
      isActive: false
    };
    paymentServiceSpy.toggleSubscriptionPlanStatus.and.returnValue(of(updatedPlan));

    component.togglePlanStatus(mockPlans[1]);

    expect(paymentServiceSpy.toggleSubscriptionPlanStatus).toHaveBeenCalledWith('PRO_ANNUAL');
    expect(component.feedback()?.type).toBe('success');
  });
});
