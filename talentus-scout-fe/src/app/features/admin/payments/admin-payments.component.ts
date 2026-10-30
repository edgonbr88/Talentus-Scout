import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminHeaderComponent } from '../../../shared/components/admin-header/admin-header.component';
import { PaymentService } from '../../../core/services/payment.service';
import {
  AdminPaymentSummary,
  PaymentTransactionResponse,
  DiscountCodeAdminDto,
  CreateDiscountCodeRequest,
  UpdateDiscountCodeRequest,
  PaymentGatewaySettingsDto,
  UpdatePaymentGatewaySettingsRequest,
  SubscriptionPlanAdminDto,
  CreateSubscriptionPlanRequest,
  UpdateSubscriptionPlanRequest
} from '../../../core/models/payment.model';

@Component({
  selector: 'app-admin-payments',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe, DecimalPipe, AdminHeaderComponent],
  templateUrl: './admin-payments.component.html',
  styleUrls: ['./admin-payments.component.css']
})
export class AdminPaymentsComponent implements OnInit {
  private paymentService = inject(PaymentService);

  // Pestaña activa
  readonly activeTab = signal<'PENDING' | 'HISTORY' | 'COUPONS' | 'GATEWAY_SETTINGS' | 'PLANS_CONFIG'>('PENDING');

  // Métricas y KPIs
  readonly summary = signal<AdminPaymentSummary | null>(null);

  // Cola de pendientes
  readonly pendingPayments = signal<PaymentTransactionResponse[]>([]);
  readonly totalPending = signal<number>(0);
  readonly isLoading = signal<boolean>(true);
  readonly isProcessing = signal<boolean>(false);
  readonly processingId = signal<string | null>(null);

  // Historial y filtros
  readonly historyPayments = signal<PaymentTransactionResponse[]>([]);
  readonly isLoadingHistory = signal<boolean>(false);
  readonly filterMethod = signal<string>('ALL');
  readonly filterStatus = signal<string>('ALL');
  readonly currentPage = signal<number>(0);
  readonly totalPages = signal<number>(1);
  readonly totalHistoryElements = signal<number>(0);

  // Gestión de Cupones y Convenios
  readonly discountCodes = signal<DiscountCodeAdminDto[]>([]);
  readonly isLoadingCodes = signal<boolean>(false);
  readonly codesCurrentPage = signal<number>(0);
  readonly codesTotalPages = signal<number>(1);
  readonly codesTotalElements = signal<number>(0);
  readonly clubs = signal<{ id: string; name: string }[]>([]);

  // Modal Crear / Editar Cupón
  readonly isCouponModalOpen = signal<boolean>(false);
  readonly editingCouponId = signal<string | null>(null);
  readonly isSavingCoupon = signal<boolean>(false);
  readonly couponFormError = signal<string | null>(null);

  // Formulario de Cupones
  couponCodeInput = '';
  couponDescriptionInput = '';
  couponTypeInput: 'PERCENTAGE' | 'FIXED_AMOUNT' = 'PERCENTAGE';
  couponValueInput: number = 20;
  couponMaxUsesInput: number | null = null;
  couponOneUsePerAthleteInput = true;
  couponPlanRestrictionInput = '';
  couponOrganizationIdInput = '';
  couponStartsAtInput = '';
  couponExpiresAtInput = '';
  couponIsActiveInput = true;
  readonly copiedCode = signal<string | null>(null);

  // Notificaciones y Toasts
  readonly feedback = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal de Rechazo
  readonly isRejectModalOpen = signal<boolean>(false);
  readonly paymentToReject = signal<PaymentTransactionResponse | null>(null);
  rejectionReasonInput = '';
  readonly rejectionError = signal<string | null>(null);

  // Configuración de Cuentas de Cobro y Pasarelas (TS-58)
  readonly gatewaySettings = signal<PaymentGatewaySettingsDto | null>(null);
  readonly isLoadingGateway = signal<boolean>(false);
  readonly isSavingGateway = signal<boolean>(false);
  readonly isUploadingQr = signal<boolean>(false);
  readonly qrPreviewUrl = signal<string | null>(null);
  selectedQrFile: File | null = null;

  // Formulario Pago Móvil
  pmEnabledInput = true;
  pmBankInput = '';
  pmPhoneInput = '';
  pmIdNumberInput = '';
  pmAccountHolderInput = '';

  // Formulario Binance
  binanceEnabledInput = true;
  binancePayIdInput = '';
  binanceWalletInput = '';
  binanceNetworkInput = 'USDT (TRC-20 / BEP-20)';
  readonly binanceQrImageUrlDisplay = signal<string>('/assets/images/binance-qr-sample.png');

  // Gestión de Planes y Precios (TS-63)
  readonly subscriptionPlans = signal<SubscriptionPlanAdminDto[]>([]);
  readonly isLoadingPlans = signal<boolean>(false);
  readonly isPlanModalOpen = signal<boolean>(false);
  readonly editingPlanId = signal<string | null>(null);
  readonly isSavingPlan = signal<boolean>(false);
  readonly planFormError = signal<string | null>(null);

  // Formulario de Planes
  planIdInput = '';
  planNameInput = '';
  planPriceUsdInput = 5;
  planDurationDaysInput = 30;
  planMaxVideosInput = 5;
  planHasRadarViewsInput = true;
  planHasPdfCvInput = true;
  planIsActiveInput = true;

  ngOnInit(): void {
    this.loadSummary();
    this.loadPendingPayments();
    this.loadGatewaySettings();
    this.loadSubscriptionPlans();
  }

  setTab(tab: 'PENDING' | 'HISTORY' | 'COUPONS' | 'GATEWAY_SETTINGS' | 'PLANS_CONFIG'): void {
    this.activeTab.set(tab);
    if (tab === 'HISTORY' && this.historyPayments().length === 0) {
      this.loadHistory();
    } else if (tab === 'COUPONS' && this.discountCodes().length === 0) {
      this.loadDiscountCodes();
      this.loadClubs();
    } else if (tab === 'GATEWAY_SETTINGS' && !this.gatewaySettings()) {
      this.loadGatewaySettings();
    } else if (tab === 'PLANS_CONFIG' && this.subscriptionPlans().length === 0) {
      this.loadSubscriptionPlans();
    }
  }

  loadSummary(): void {
    this.paymentService.getAdminPaymentSummary().subscribe({
      next: (res) => this.summary.set(res),
      error: (err) => console.error('Error al cargar métricas de pagos:', err)
    });
  }

  loadPendingPayments(): void {
    this.isLoading.set(true);
    this.paymentService.getPendingPayments().subscribe({
      next: (list) => {
        this.pendingPayments.set(list || []);
        this.totalPending.set((list || []).length);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.showFeedback('error', 'Error al cargar la cola de pagos pendientes: ' + (err.error?.message || err.message));
      }
    });
  }

  loadHistory(page: number = 0): void {
    this.isLoadingHistory.set(true);
    this.currentPage.set(page);

    this.paymentService.getAdminPaymentHistory({
      method: this.filterMethod(),
      status: this.filterStatus(),
      page: page,
      size: 15
    }).subscribe({
      next: (res) => {
        this.historyPayments.set(res.content || []);
        this.totalPages.set(res.totalPages || 1);
        this.totalHistoryElements.set(res.totalElements || 0);
        this.isLoadingHistory.set(false);
      },
      error: (err) => {
        this.isLoadingHistory.set(false);
        this.showFeedback('error', 'Error al cargar el historial contable: ' + (err.error?.message || err.message));
      }
    });
  }

  onFilterChange(): void {
    this.loadHistory(0);
  }

  approvePayment(tx: PaymentTransactionResponse): void {
    if (this.isProcessing()) return;

    this.isProcessing.set(true);
    this.processingId.set(tx.id);

    this.paymentService.approvePayment(tx.id).subscribe({
      next: () => {
        this.isProcessing.set(false);
        this.processingId.set(null);
        this.showFeedback('success', `Pago #${tx.referenceNumber || tx.gatewayOrderId} aprobado. Plan Pro activado para ${tx.athleteName}.`);
        this.removeTransactionFromList(tx.id);
        this.loadSummary();
      },
      error: (err) => {
        this.isProcessing.set(false);
        this.processingId.set(null);
        this.showFeedback('error', 'Error al aprobar el pago: ' + (err.error?.message || err.message));
      }
    });
  }

  openRejectModal(tx: PaymentTransactionResponse): void {
    this.paymentToReject.set(tx);
    this.rejectionReasonInput = '';
    this.rejectionError.set(null);
    this.isRejectModalOpen.set(true);
  }

  closeRejectModal(): void {
    if (this.isProcessing()) return;
    this.isRejectModalOpen.set(false);
    this.paymentToReject.set(null);
    this.rejectionReasonInput = '';
    this.rejectionError.set(null);
  }

  confirmReject(): void {
    const tx = this.paymentToReject();
    if (!tx || this.isProcessing()) return;

    const reason = this.rejectionReasonInput.trim();
    if (!reason || reason.length < 5) {
      this.rejectionError.set('Debe ingresar un motivo claro y descriptivo del rechazo (mínimo 5 caracteres).');
      return;
    }

    this.isProcessing.set(true);
    this.paymentService.rejectPayment(tx.id, reason).subscribe({
      next: () => {
        this.isProcessing.set(false);
        this.isRejectModalOpen.set(false);
        this.showFeedback('success', `Pago #${tx.referenceNumber || tx.gatewayOrderId} rechazado con motivo documentado.`);
        this.removeTransactionFromList(tx.id);
        this.loadSummary();
      },
      error: (err) => {
        this.isProcessing.set(false);
        this.rejectionError.set('Error al procesar el rechazo: ' + (err.error?.message || err.message));
      }
    });
  }

  private removeTransactionFromList(id: string): void {
    const updated = this.pendingPayments().filter(t => t.id !== id);
    this.pendingPayments.set(updated);
    this.totalPending.set(updated.length);
  }

  // GESTIÓN DE CÓDIGOS DE DESCUENTO Y CONVENIOS
  loadDiscountCodes(page: number = 0): void {
    this.isLoadingCodes.set(true);
    this.codesCurrentPage.set(page);
    this.paymentService.getAdminDiscountCodes(page, 15).subscribe({
      next: (res) => {
        this.discountCodes.set(res.content || []);
        this.codesTotalPages.set(res.totalPages || 1);
        this.codesTotalElements.set(res.totalElements || 0);
        this.isLoadingCodes.set(false);
      },
      error: (err) => {
        this.isLoadingCodes.set(false);
        this.showFeedback('error', 'Error al cargar códigos de descuento: ' + (err.error?.message || err.message));
      }
    });
  }

  loadClubs(): void {
    this.paymentService.getClubs().subscribe({
      next: (clubs) => this.clubs.set(clubs || []),
      error: (err) => console.warn('No se pudieron precargar organizaciones deportivas:', err)
    });
  }

  openCreateCouponModal(): void {
    this.editingCouponId.set(null);
    this.couponCodeInput = '';
    this.couponDescriptionInput = '';
    this.couponTypeInput = 'PERCENTAGE';
    this.couponValueInput = 20;
    this.couponMaxUsesInput = null;
    this.couponOneUsePerAthleteInput = true;
    this.couponPlanRestrictionInput = '';
    this.couponOrganizationIdInput = '';
    this.couponStartsAtInput = '';
    this.couponExpiresAtInput = '';
    this.couponIsActiveInput = true;
    this.couponFormError.set(null);
    this.isCouponModalOpen.set(true);
  }

  openEditCouponModal(item: DiscountCodeAdminDto): void {
    this.editingCouponId.set(item.id);
    this.couponCodeInput = item.code;
    this.couponDescriptionInput = item.description || '';
    this.couponTypeInput = item.discountType;
    this.couponValueInput = item.discountValue;
    this.couponMaxUsesInput = item.maxUses ?? null;
    this.couponOneUsePerAthleteInput = item.oneUsePerAthlete;
    this.couponPlanRestrictionInput = item.applicablePlanId || '';
    this.couponOrganizationIdInput = item.organizationId || '';
    this.couponStartsAtInput = item.startsAt ? item.startsAt.substring(0, 10) : '';
    this.couponExpiresAtInput = item.expiresAt ? item.expiresAt.substring(0, 10) : '';
    this.couponIsActiveInput = item.isActive;
    this.couponFormError.set(null);
    this.isCouponModalOpen.set(true);
  }

  closeCouponModal(): void {
    if (this.isSavingCoupon()) return;
    this.isCouponModalOpen.set(false);
    this.editingCouponId.set(null);
    this.couponFormError.set(null);
  }

  saveCoupon(): void {
    const code = this.couponCodeInput.trim().toUpperCase();
    if (!this.editingCouponId() && (!code || code.length < 3)) {
      this.couponFormError.set('El código de descuento debe tener al menos 3 caracteres alfanuméricos.');
      return;
    }
    if (this.couponValueInput <= 0) {
      this.couponFormError.set('El valor del descuento debe ser mayor a 0.');
      return;
    }
    if (this.couponTypeInput === 'PERCENTAGE' && this.couponValueInput > 100) {
      this.couponFormError.set('El porcentaje de descuento no puede ser superior al 100%.');
      return;
    }

    this.isSavingCoupon.set(true);
    this.couponFormError.set(null);

    const startsAtIso = this.couponStartsAtInput ? `${this.couponStartsAtInput}T00:00:00Z` : undefined;
    const expiresAtIso = this.couponExpiresAtInput ? `${this.couponExpiresAtInput}T23:59:59Z` : undefined;

    if (this.editingCouponId()) {
      const updateReq: UpdateDiscountCodeRequest = {
        description: this.couponDescriptionInput.trim() || undefined,
        discountType: this.couponTypeInput,
        discountValue: this.couponValueInput,
        organizationId: this.couponOrganizationIdInput.trim() || undefined,
        applicablePlanId: this.couponPlanRestrictionInput.trim() || undefined,
        maxUses: this.couponMaxUsesInput ?? undefined,
        oneUsePerAthlete: this.couponOneUsePerAthleteInput,
        startsAt: startsAtIso,
        expiresAt: expiresAtIso,
        isActive: this.couponIsActiveInput
      };
      this.paymentService.updateAdminDiscountCode(this.editingCouponId()!, updateReq).subscribe({
        next: (saved) => {
          this.isSavingCoupon.set(false);
          this.isCouponModalOpen.set(false);
          this.showFeedback('success', `Código ${saved.code} actualizado correctamente.`);
          this.loadDiscountCodes(this.codesCurrentPage());
        },
        error: (err) => {
          this.isSavingCoupon.set(false);
          this.couponFormError.set('Error al actualizar el cupón: ' + (err.error?.message || err.message));
        }
      });
    } else {
      const createReq: CreateDiscountCodeRequest = {
        code: code,
        description: this.couponDescriptionInput.trim() || undefined,
        discountType: this.couponTypeInput,
        discountValue: this.couponValueInput,
        organizationId: this.couponOrganizationIdInput.trim() || undefined,
        applicablePlanId: this.couponPlanRestrictionInput.trim() || undefined,
        maxUses: this.couponMaxUsesInput ?? undefined,
        oneUsePerAthlete: this.couponOneUsePerAthleteInput,
        startsAt: startsAtIso,
        expiresAt: expiresAtIso,
        isActive: this.couponIsActiveInput
      };
      this.paymentService.createAdminDiscountCode(createReq).subscribe({
        next: (created) => {
          this.isSavingCoupon.set(false);
          this.isCouponModalOpen.set(false);
          this.showFeedback('success', `Código ${created.code} creado exitosamente.`);
          this.loadDiscountCodes(0);
        },
        error: (err) => {
          this.isSavingCoupon.set(false);
          this.couponFormError.set('Error al crear el código: ' + (err.error?.message || err.message));
        }
      });
    }
  }

  toggleCodeStatus(item: DiscountCodeAdminDto): void {
    this.paymentService.toggleAdminDiscountCodeStatus(item.id).subscribe({
      next: (updated) => {
        this.showFeedback('success', `Código ${updated.code} ${updated.isActive ? 'activado' : 'pausado'} correctamente.`);
        this.discountCodes.set(this.discountCodes().map(c => c.id === updated.id ? updated : c));
      },
      error: (err) => {
        this.showFeedback('error', 'Error al alternar estado del código: ' + (err.error?.message || err.message));
      }
    });
  }

  deleteCode(item: DiscountCodeAdminDto): void {
    if (!confirm(`¿Estás seguro de que deseas eliminar o archivar el código "${item.code}"?`)) {
      return;
    }
    this.paymentService.deleteAdminDiscountCode(item.id).subscribe({
      next: () => {
        this.showFeedback('success', `Código "${item.code}" eliminado.`);
        this.loadDiscountCodes(this.codesCurrentPage());
      },
      error: (err) => {
        this.showFeedback('error', 'Error al eliminar el código: ' + (err.error?.message || err.message));
      }
    });
  }

  copyCodeToClipboard(code: string): void {
    navigator.clipboard.writeText(code).then(() => {
      this.copiedCode.set(code);
      setTimeout(() => {
        if (this.copiedCode() === code) {
          this.copiedCode.set(null);
        }
      }, 2500);
    }).catch(() => {
      // Fallback
    });
  }

  // --- Gestión de Cuentas de Cobro y Pasarelas (TS-58) ---

  loadGatewaySettings(): void {
    this.isLoadingGateway.set(true);
    this.paymentService.getPaymentGatewaySettings().subscribe({
      next: (settings) => {
        this.gatewaySettings.set(settings);
        this.pmEnabledInput = settings.pagoMovilEnabled;
        this.pmBankInput = settings.pagoMovilBank || '';
        this.pmPhoneInput = settings.pagoMovilPhone || '';
        this.pmIdNumberInput = settings.pagoMovilIdNumber || '';
        this.pmAccountHolderInput = settings.pagoMovilAccountHolder || '';

        this.binanceEnabledInput = settings.binanceManualEnabled;
        this.binancePayIdInput = settings.binancePayId || '';
        this.binanceWalletInput = settings.binanceWalletAddress || '';
        this.binanceNetworkInput = settings.binanceNetwork || 'USDT (TRC-20 / BEP-20)';
        if (settings.binanceQrImageUrl) {
          this.binanceQrImageUrlDisplay.set(settings.binanceQrImageUrl);
        }
        this.isLoadingGateway.set(false);
      },
      error: (err) => {
        this.isLoadingGateway.set(false);
        this.showFeedback('error', 'Error al cargar la configuración de cuentas de cobro: ' + (err.error?.message || err.message));
      }
    });
  }

  saveGatewaySettings(): void {
    if (this.pmEnabledInput) {
      if (!this.pmBankInput.trim() || !this.pmPhoneInput.trim() || !this.pmIdNumberInput.trim() || !this.pmAccountHolderInput.trim()) {
        this.showFeedback('error', 'Todos los campos de Pago Móvil son obligatorios mientras el método esté activo.');
        return;
      }
    }

    this.isSavingGateway.set(true);
    const request: UpdatePaymentGatewaySettingsRequest = {
      pagoMovilEnabled: this.pmEnabledInput,
      pagoMovilBank: this.pmBankInput.trim(),
      pagoMovilPhone: this.pmPhoneInput.trim(),
      pagoMovilIdNumber: this.pmIdNumberInput.trim(),
      pagoMovilAccountHolder: this.pmAccountHolderInput.trim(),
      binanceManualEnabled: this.binanceEnabledInput,
      binancePayId: this.binancePayIdInput.trim() || undefined,
      binanceWalletAddress: this.binanceWalletInput.trim() || undefined,
      binanceNetwork: this.binanceNetworkInput.trim() || undefined
    };

    this.paymentService.updatePaymentGatewaySettings(request).subscribe({
      next: (updated) => {
        this.gatewaySettings.set(updated);
        this.isSavingGateway.set(false);
        this.showFeedback('success', 'Configuración de cuentas de cobro guardada exitosamente.');
      },
      error: (err) => {
        this.isSavingGateway.set(false);
        this.showFeedback('error', 'Error al guardar la configuración: ' + (err.error?.message || err.message));
      }
    });
  }

  onQrFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }
    const file = input.files[0];

    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowed.includes(file.type.toLowerCase())) {
      this.showFeedback('error', 'Formato no válido. Solo se admiten imágenes PNG, JPG o WEBP.');
      input.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.showFeedback('error', 'La imagen excede el límite máximo de 5MB.');
      input.value = '';
      return;
    }

    this.selectedQrFile = file;

    const reader = new FileReader();
    reader.onload = () => {
      this.qrPreviewUrl.set(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  uploadSelectedQr(): void {
    if (!this.selectedQrFile) {
      return;
    }
    this.isUploadingQr.set(true);
    this.paymentService.uploadBinanceQrImage(this.selectedQrFile).subscribe({
      next: (res) => {
        this.binanceQrImageUrlDisplay.set(res.qrImageUrl);
        this.selectedQrFile = null;
        this.qrPreviewUrl.set(null);
        this.isUploadingQr.set(false);
        this.showFeedback('success', 'Código QR de Binance actualizado y publicado con éxito.');
      },
      error: (err) => {
        this.isUploadingQr.set(false);
        this.showFeedback('error', 'Error al subir el código QR: ' + (err.error?.message || err.message));
      }
    });
  }

  cancelSelectedQr(): void {
    this.selectedQrFile = null;
    this.qrPreviewUrl.set(null);
  }

  // ==========================================
  // Métodos de Planes de Suscripción (TS-63)
  // ==========================================

  getActivePlansCount(): number {
    return this.subscriptionPlans().filter(p => p.isActive).length;
  }

  loadSubscriptionPlans(): void {
    this.isLoadingPlans.set(true);
    this.paymentService.getAdminSubscriptionPlans().subscribe({
      next: (plans) => {
        this.subscriptionPlans.set(plans || []);
        this.isLoadingPlans.set(false);
      },
      error: (err) => {
        this.isLoadingPlans.set(false);
        this.showFeedback('error', 'Error al cargar los planes de suscripción: ' + (err.error?.message || err.message));
      }
    });
  }

  openCreatePlanModal(): void {
    this.editingPlanId.set(null);
    this.planIdInput = '';
    this.planNameInput = '';
    this.planPriceUsdInput = 5;
    this.planDurationDaysInput = 30;
    this.planMaxVideosInput = 5;
    this.planHasRadarViewsInput = true;
    this.planHasPdfCvInput = true;
    this.planIsActiveInput = true;
    this.planFormError.set(null);
    this.isPlanModalOpen.set(true);
  }

  openEditPlanModal(plan: SubscriptionPlanAdminDto): void {
    this.editingPlanId.set(plan.id);
    this.planIdInput = plan.id;
    this.planNameInput = plan.name;
    this.planPriceUsdInput = plan.priceUsd;
    this.planDurationDaysInput = plan.durationDays;
    this.planMaxVideosInput = plan.maxVideos;
    this.planHasRadarViewsInput = plan.hasRadarViews;
    this.planHasPdfCvInput = plan.hasPdfCv;
    this.planIsActiveInput = plan.isActive;
    this.planFormError.set(null);
    this.isPlanModalOpen.set(true);
  }

  closePlanModal(): void {
    if (this.isSavingPlan()) return;
    this.isPlanModalOpen.set(false);
    this.editingPlanId.set(null);
    this.planFormError.set(null);
  }

  savePlan(): void {
    this.planFormError.set(null);
    const name = this.planNameInput.trim();
    if (!name) {
      this.planFormError.set('El nombre del plan es obligatorio.');
      return;
    }
    if (this.planPriceUsdInput == null || this.planPriceUsdInput < 0) {
      this.planFormError.set('El precio en USD debe ser igual o mayor a 0.00.');
      return;
    }
    if (!this.planDurationDaysInput || this.planDurationDaysInput < 1) {
      this.planFormError.set('La duración debe ser de al menos 1 día.');
      return;
    }
    if (this.planMaxVideosInput == null || this.planMaxVideosInput < 0) {
      this.planFormError.set('El cupo de videos no puede ser negativo.');
      return;
    }

    this.isSavingPlan.set(true);

    if (this.editingPlanId()) {
      // Modo Edición
      const req: UpdateSubscriptionPlanRequest = {
        name,
        priceUsd: this.planPriceUsdInput,
        durationDays: this.planDurationDaysInput,
        maxVideos: this.planMaxVideosInput,
        hasRadarViews: this.planHasRadarViewsInput,
        hasPdfCv: this.planHasPdfCvInput,
        isActive: this.planIsActiveInput
      };

      this.paymentService.updateSubscriptionPlan(this.editingPlanId()!, req).subscribe({
        next: (updated) => {
          this.isSavingPlan.set(false);
          this.subscriptionPlans.update(plans => plans.map(p => p.id === updated.id ? updated : p));
          this.closePlanModal();
          this.showFeedback('success', `Plan '${updated.name}' actualizado exitosamente.`);
        },
        error: (err) => {
          this.isSavingPlan.set(false);
          this.planFormError.set(err.error?.message || 'Error al actualizar el plan de suscripción');
        }
      });
    } else {
      // Modo Creación
      const rawId = this.planIdInput.trim().toUpperCase();
      if (!rawId) {
        this.planFormError.set('El identificador único del plan es obligatorio.');
        this.isSavingPlan.set(false);
        return;
      }
      const idRegex = /^[A-Z0-9_]{3,50}$/;
      if (!idRegex.test(rawId)) {
        this.planFormError.set('El ID debe tener entre 3 y 50 caracteres (solo mayúsculas, números y guiones bajos, ej. PRO_SEMESTRAL).');
        this.isSavingPlan.set(false);
        return;
      }

      const req: CreateSubscriptionPlanRequest = {
        id: rawId,
        name,
        priceUsd: this.planPriceUsdInput,
        durationDays: this.planDurationDaysInput,
        maxVideos: this.planMaxVideosInput,
        hasRadarViews: this.planHasRadarViewsInput,
        hasPdfCv: this.planHasPdfCvInput,
        isActive: this.planIsActiveInput
      };

      this.paymentService.createSubscriptionPlan(req).subscribe({
        next: (created) => {
          this.isSavingPlan.set(false);
          this.subscriptionPlans.update(plans => [...plans, created].sort((a, b) => a.priceUsd - b.priceUsd));
          this.closePlanModal();
          this.showFeedback('success', `Plan '${created.name}' (${created.id}) creado exitosamente.`);
        },
        error: (err) => {
          this.isSavingPlan.set(false);
          this.planFormError.set(err.error?.message || 'Error al crear el nuevo plan de suscripción');
        }
      });
    }
  }

  togglePlanStatus(plan: SubscriptionPlanAdminDto): void {
    if (plan.isActive && this.getActivePlansCount() <= 1) {
      this.showFeedback('error', 'No es posible desactivar el único plan activo disponible en la plataforma.');
      return;
    }

    this.paymentService.toggleSubscriptionPlanStatus(plan.id).subscribe({
      next: (updated) => {
        this.subscriptionPlans.update(plans => plans.map(p => p.id === updated.id ? updated : p));
        const statusText = updated.isActive ? 'activado' : 'pausado / desactivado';
        this.showFeedback('success', `Plan '${updated.name}' ${statusText} correctamente.`);
      },
      error: (err) => {
        this.showFeedback('error', 'Error al cambiar estado del plan: ' + (err.error?.message || err.message));
      }
    });
  }

  private showFeedback(type: 'success' | 'error', text: string): void {
    this.feedback.set({ type, text });
    setTimeout(() => {
      if (this.feedback()?.text === text) {
        this.feedback.set(null);
      }
    }, 6000);
  }
}
