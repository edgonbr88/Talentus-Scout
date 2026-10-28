import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentService } from '../../core/services/payment.service';
import { AthleteSummary } from '../../core/models/athlete.model';
import {
  BcvRateResponse,
  CreateBinanceOrderResponse,
  PaymentConfigResponse,
  PaymentTransactionResponse,
  SubscriptionPlanDto,
  ValidateCouponResponse
} from '../../core/models/payment.model';

@Component({
  selector: 'app-checkout-pago-movil-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe],
  templateUrl: './checkout-pago-movil-modal.component.html',
  styleUrls: ['./checkout-pago-movil-modal.component.css']
})
export class CheckoutPagoMovilModalComponent implements OnInit {
  private paymentService = inject(PaymentService);

  @Input({ required: true }) athlete!: AthleteSummary;
  @Output() close = new EventEmitter<void>();
  @Output() paymentReported = new EventEmitter<PaymentTransactionResponse>();

  // Método de pago seleccionado
  readonly selectedMethod = signal<'PAGO_MOVIL' | 'BINANCE_PAY'>('PAGO_MOVIL');

  // Estados de datos
  readonly config = signal<PaymentConfigResponse | null>(null);
  readonly bcvRate = signal<BcvRateResponse | null>(null);
  readonly selectedPlan = signal<SubscriptionPlanDto | null>(null);

  // Estados de interfaz
  readonly isLoading = signal<boolean>(true);
  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly copyFeedback = signal<string | null>(null);

  // Estados de Binance Pay
  readonly binanceOrder = signal<CreateBinanceOrderResponse | null>(null);
  readonly isGeneratingBinance = signal<boolean>(false);
  readonly binanceNotice = signal<string | null>(null);

  // Estados de Cupón / Convenio
  couponInput = '';
  readonly appliedCoupon = signal<ValidateCouponResponse | null>(null);
  readonly isValidatingCoupon = signal<boolean>(false);
  readonly couponError = signal<string | null>(null);
  readonly couponSuccess = signal<string | null>(null);

  // Formulario Pago Móvil
  referenceNumber = '';
  paymentDate = new Date().toISOString().substring(0, 10);
  originBank = 'Banco de Venezuela';
  originPhone = '';

  // Formulario Binance Manual
  binanceReference = '';
  binancePaymentDate = new Date().toISOString().substring(0, 10);
  binanceOriginAccount = '';
  readonly isSubmittingBinance = signal<boolean>(false);

  readonly popularBanks = [
    'Banco de Venezuela',
    'Banesco',
    'Mercantil',
    'BBVA Provincial',
    'Bancaribe',
    'Banco Nacional de Crédito (BNC)',
    'Banco Exterior',
    'Otro Banco'
  ];

  ngOnInit(): void {
    this.loadPaymentData();
  }

  loadPaymentData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.paymentService.getPaymentConfig().subscribe({
      next: (cfg) => {
        this.config.set(cfg);
        if (cfg.plans && cfg.plans.length > 0) {
          const defaultPlan = cfg.plans.find(p => p.id === 'PRO_MONTHLY') || cfg.plans[0];
          this.selectedPlan.set(defaultPlan);
        }
        if (cfg.pagoMovilEnabled === false && cfg.binanceManualEnabled !== false) {
          this.selectedMethod.set('BINANCE_PAY');
        } else if (cfg.binanceManualEnabled === false && cfg.pagoMovilEnabled !== false) {
          this.selectedMethod.set('PAGO_MOVIL');
        }
        this.fetchBcvRate();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set('No se pudo cargar la configuración de pago: ' + (err.error?.message || err.message));
      }
    });
  }

  fetchBcvRate(): void {
    this.paymentService.getBcvRate().subscribe({
      next: (rate) => {
        this.bcvRate.set(rate);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  setMethod(method: 'PAGO_MOVIL' | 'BINANCE_PAY'): void {
    if (method === 'PAGO_MOVIL' && this.config()?.pagoMovilEnabled === false) {
      return;
    }
    if (method === 'BINANCE_PAY' && this.config()?.binanceManualEnabled === false) {
      return;
    }
    this.selectedMethod.set(method);
    this.errorMessage.set(null);
    this.binanceNotice.set(null);
  }

  selectPlan(plan: SubscriptionPlanDto): void {
    this.selectedPlan.set(plan);
    // Si cambia de plan y había una orden Binance generada, se resetea
    if (this.binanceOrder()) {
      this.binanceOrder.set(null);
    }
    // Revalidar cupón si ya había uno ingresado
    if (this.appliedCoupon()) {
      this.applyCoupon();
    }
  }

  get effectiveAmountUsd(): number {
    const coupon = this.appliedCoupon();
    if (coupon && coupon.valid && coupon.finalAmountUsd !== undefined) {
      return coupon.finalAmountUsd;
    }
    return this.selectedPlan()?.priceUsd || 0;
  }

  get discountAmountUsd(): number {
    const coupon = this.appliedCoupon();
    if (coupon && coupon.valid && coupon.discountAmountUsd !== undefined) {
      return coupon.discountAmountUsd;
    }
    return 0;
  }

  get isFreePromo(): boolean {
    return this.appliedCoupon()?.isFreePromo === true;
  }

  get calculatedAmountVes(): number {
    const coupon = this.appliedCoupon();
    if (coupon && coupon.valid && coupon.finalAmountVes !== undefined) {
      return coupon.finalAmountVes;
    }
    const rate = this.bcvRate();
    if (!rate || !rate.officialRate) return 0;
    return Number((this.effectiveAmountUsd * rate.officialRate).toFixed(2));
  }

  applyCoupon(): void {
    const code = this.couponInput.trim();
    if (!code) return;

    const plan = this.selectedPlan();
    if (!plan) {
      this.couponError.set('Selecciona un plan primero.');
      return;
    }

    this.isValidatingCoupon.set(true);
    this.couponError.set(null);
    this.couponSuccess.set(null);

    this.paymentService.validateCoupon({
      code: code,
      athleteId: this.athlete.id,
      planId: plan.id
    }).subscribe({
      next: (res) => {
        this.isValidatingCoupon.set(false);
        if (res.valid) {
          this.appliedCoupon.set(res);
          this.couponSuccess.set(res.message);
          if (this.binanceOrder()) {
            this.binanceOrder.set(null);
          }
        } else {
          this.appliedCoupon.set(null);
          this.couponError.set(res.message);
        }
      },
      error: (err) => {
        this.isValidatingCoupon.set(false);
        this.appliedCoupon.set(null);
        this.couponError.set(err.error?.message || 'Error al validar el código.');
      }
    });
  }

  removeCoupon(): void {
    this.appliedCoupon.set(null);
    this.couponInput = '';
    this.couponError.set(null);
    this.couponSuccess.set(null);
    if (this.binanceOrder()) {
      this.binanceOrder.set(null);
    }
  }

  redeemFreeSubscription(): void {
    const coupon = this.appliedCoupon();
    const plan = this.selectedPlan();
    if (!coupon || !coupon.isFreePromo || !plan) return;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.paymentService.redeemFreePromo({
      code: coupon.code!,
      athleteId: this.athlete.id,
      planId: plan.id
    }).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.paymentReported.emit(res);
        this.closeModal();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || 'Error al activar la membresía bonificada.');
      }
    });
  }

  copyToClipboard(text: string, label: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.copyFeedback.set(`${label} copiado`);
      setTimeout(() => this.copyFeedback.set(null), 2500);
    }).catch(() => {
      this.copyFeedback.set('Error al copiar');
      setTimeout(() => this.copyFeedback.set(null), 2500);
    });
  }

  // --- Flujo Binance Pay ---
  generateBinanceOrder(): void {
    const plan = this.selectedPlan();
    if (!plan) {
      this.errorMessage.set('Por favor selecciona un plan antes de generar la orden.');
      return;
    }

    this.isGeneratingBinance.set(true);
    this.errorMessage.set(null);
    this.binanceNotice.set(null);

    this.paymentService.createBinanceOrder({
      athleteId: this.athlete.id,
      planId: plan.id,
      discountCode: this.appliedCoupon()?.code
    }).subscribe({
      next: (res) => {
        this.isGeneratingBinance.set(false);
        this.binanceOrder.set(res);
      },
      error: (err) => {
        this.isGeneratingBinance.set(false);
        this.errorMessage.set(err.error?.message || 'Error al conectar con Binance Pay. Por favor intenta de nuevo.');
      }
    });
  }

  checkBinanceStatus(): void {
    this.binanceNotice.set('Verificando activación en la red Binance...');
    this.paymentService.getAthleteSubscriptionStatus(this.athlete.id).subscribe({
      next: (status) => {
        if (status.status === 'ACTIVE') {
          this.paymentReported.emit({
            id: this.binanceOrder()?.transactionId || '',
            athleteId: this.athlete.id,
            athleteName: this.athlete.fullName,
            planId: this.selectedPlan()?.id || 'PRO_MONTHLY',
            planName: this.selectedPlan()?.name || 'Plan Pro',
            method: 'BINANCE_PAY',
            amountUsd: this.selectedPlan()?.priceUsd || 5,
            amountVes: 0,
            bcvExchangeRate: 0,
            referenceNumber: this.binanceOrder()?.gatewayOrderId || '',
            paymentDate: new Date().toISOString().substring(0, 10),
            status: 'APPROVED',
            createdAt: new Date().toISOString()
          });
          this.closeModal();
        } else {
          this.binanceNotice.set('Aún estamos esperando la confirmación de Binance Pay. En cuanto envíes la transferencia se activará en pocos segundos.');
        }
      },
      error: () => {
        this.binanceNotice.set('Consulta enviada. Por favor espera unos momentos y refresca.');
      }
    });
  }

  // --- Flujo Pago Móvil ---
  submitReport(): void {
    if (!this.referenceNumber || this.referenceNumber.trim().length < 4) {
      this.errorMessage.set('Por favor ingresa un número de referencia bancaria válido (mínimo 4 dígitos).');
      return;
    }

    if (!this.paymentDate) {
      this.errorMessage.set('Por favor indica la fecha en que realizaste el pago.');
      return;
    }

    const plan = this.selectedPlan();
    if (!plan) {
      this.errorMessage.set('Por favor selecciona un plan.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.paymentService.reportPagoMovil({
      athleteId: this.athlete.id,
      planId: plan.id,
      referenceNumber: this.referenceNumber.trim(),
      paymentDate: this.paymentDate,
      amountVes: this.calculatedAmountVes,
      bcvRate: this.bcvRate()?.officialRate,
      originBank: this.originBank,
      originPhone: this.originPhone ? this.originPhone.trim() : undefined,
      discountCode: this.appliedCoupon()?.code
    }).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.paymentReported.emit(res);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || 'Error al reportar el pago. Por favor intenta nuevamente.');
      }
    });
  }

  // --- Reporte Manual Binance ---
  submitBinanceReport(): void {
    if (!this.binanceReference || this.binanceReference.trim().length < 4) {
      this.errorMessage.set('Por favor ingresa un número de referencia o TxID válido de Binance (mínimo 4 caracteres).');
      return;
    }

    if (!this.binancePaymentDate) {
      this.errorMessage.set('Por favor indica la fecha en que realizaste la transferencia.');
      return;
    }

    const plan = this.selectedPlan();
    if (!plan) {
      this.errorMessage.set('Por favor selecciona un plan.');
      return;
    }

    this.isSubmittingBinance.set(true);
    this.errorMessage.set(null);

    this.paymentService.reportBinanceManual({
      athleteId: this.athlete.id,
      planId: plan.id,
      referenceNumber: this.binanceReference.trim(),
      paymentDate: this.binancePaymentDate,
      originAccount: this.binanceOriginAccount ? this.binanceOriginAccount.trim() : undefined,
      discountCode: this.appliedCoupon()?.code
    }).subscribe({
      next: (res) => {
        this.isSubmittingBinance.set(false);
        this.paymentReported.emit(res);
      },
      error: (err) => {
        this.isSubmittingBinance.set(false);
        this.errorMessage.set(err.error?.message || 'Error al reportar el pago de Binance. Por favor intenta nuevamente.');
      }
    });
  }

  closeModal(): void {
    if (!this.isSubmitting() && !this.isSubmittingBinance() && !this.isGeneratingBinance()) {
      this.close.emit();
    }
  }
}
