import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AdminPaymentSummary,
  AdminReviewPaymentRequest,
  AthleteSubscriptionStatusResponse,
  BcvRateResponse,
  CreateBinanceOrderRequest,
  CreateBinanceOrderResponse,
  PaymentConfigResponse,
  PaymentGatewaySettingsDto,
  PaymentHistoryPage,
  PaymentTransactionResponse,
  ReportBinanceManualPaymentRequest,
  ReportPagoMovilRequest,
  UpdatePaymentGatewaySettingsRequest
} from '../models/payment.model';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private http = inject(HttpClient);

  getPaymentConfig(): Observable<PaymentConfigResponse> {
    return this.http.get<PaymentConfigResponse>('/api/v1/payments/config');
  }

  getBcvRate(): Observable<BcvRateResponse> {
    return this.http.get<BcvRateResponse>('/api/v1/payments/bcv-rate');
  }

  reportPagoMovil(request: ReportPagoMovilRequest): Observable<PaymentTransactionResponse> {
    return this.http.post<PaymentTransactionResponse>('/api/v1/payments/report-pago-movil', request);
  }

  reportBinanceManual(request: ReportBinanceManualPaymentRequest): Observable<PaymentTransactionResponse> {
    return this.http.post<PaymentTransactionResponse>('/api/v1/payments/binance-pay/manual-report', request);
  }

  createBinanceOrder(request: CreateBinanceOrderRequest): Observable<CreateBinanceOrderResponse> {
    return this.http.post<CreateBinanceOrderResponse>('/api/v1/payments/binance-pay/create-order', request);
  }

  getAthleteSubscriptionStatus(athleteId: string): Observable<AthleteSubscriptionStatusResponse> {
    return this.http.get<AthleteSubscriptionStatusResponse>(`/api/v1/payments/athlete/${athleteId}/status`);
  }

  getPaymentHistory(): Observable<PaymentTransactionResponse[]> {
    return this.http.get<PaymentTransactionResponse[]>('/api/v1/payments/history');
  }

  // --- Admin Endpoints ---

  getAdminPaymentSummary(): Observable<AdminPaymentSummary> {
    return this.http.get<AdminPaymentSummary>('/api/v1/admin/payments/summary');
  }

  getAdminPaymentHistory(filters?: { method?: string; status?: string; page?: number; size?: number }): Observable<PaymentHistoryPage> {
    let params = new HttpParams();
    if (filters?.method && filters.method !== 'ALL') {
      params = params.set('method', filters.method);
    }
    if (filters?.status && filters.status !== 'ALL') {
      params = params.set('status', filters.status);
    }
    if (filters?.page !== undefined) {
      params = params.set('page', filters.page.toString());
    }
    if (filters?.size !== undefined) {
      params = params.set('size', filters.size.toString());
    }
    return this.http.get<PaymentHistoryPage>('/api/v1/admin/payments/history', { params });
  }

  getPendingPayments(): Observable<PaymentTransactionResponse[]> {
    return this.http.get<PaymentTransactionResponse[]>('/api/v1/admin/payments/pending');
  }

  approvePayment(id: string): Observable<PaymentTransactionResponse> {
    return this.http.post<PaymentTransactionResponse>(`/api/v1/admin/payments/${id}/approve`, {});
  }

  rejectPayment(id: string, reason?: string): Observable<PaymentTransactionResponse> {
    const payload: AdminReviewPaymentRequest = { rejectionReason: reason };
    return this.http.post<PaymentTransactionResponse>(`/api/v1/admin/payments/${id}/reject`, payload);
  }

  // --- Cupones y Convenios ---

  validateCoupon(request: import('../models/payment.model').ValidateCouponRequest): Observable<import('../models/payment.model').ValidateCouponResponse> {
    return this.http.post<import('../models/payment.model').ValidateCouponResponse>('/api/v1/payments/coupons/validate', request);
  }

  redeemFreePromo(request: import('../models/payment.model').RedeemFreePromoRequest): Observable<PaymentTransactionResponse> {
    return this.http.post<PaymentTransactionResponse>('/api/v1/payments/coupons/redeem-free', request);
  }

  getAdminDiscountCodes(page = 0, size = 20): Observable<import('../models/payment.model').DiscountCodesPage> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<import('../models/payment.model').DiscountCodesPage>('/api/v1/admin/discount-codes', { params });
  }

  createAdminDiscountCode(request: import('../models/payment.model').CreateDiscountCodeRequest): Observable<import('../models/payment.model').DiscountCodeAdminDto> {
    return this.http.post<import('../models/payment.model').DiscountCodeAdminDto>('/api/v1/admin/discount-codes', request);
  }

  updateAdminDiscountCode(id: string, request: import('../models/payment.model').UpdateDiscountCodeRequest): Observable<import('../models/payment.model').DiscountCodeAdminDto> {
    return this.http.put<import('../models/payment.model').DiscountCodeAdminDto>(`/api/v1/admin/discount-codes/${id}`, request);
  }

  toggleAdminDiscountCodeStatus(id: string): Observable<import('../models/payment.model').DiscountCodeAdminDto> {
    return this.http.patch<import('../models/payment.model').DiscountCodeAdminDto>(`/api/v1/admin/discount-codes/${id}/toggle-status`, {});
  }

  deleteAdminDiscountCode(id: string): Observable<void> {
    return this.http.delete<void>(`/api/v1/admin/discount-codes/${id}`);
  }

  getClubs(): Observable<{ id: string; name: string }[]> {
    return this.http.get<{ id: string; name: string }[]>('/api/v1/clubs');
  }

  // --- Cuentas de Cobro y Pasarelas (TS-58) ---

  getPaymentGatewaySettings(): Observable<PaymentGatewaySettingsDto> {
    return this.http.get<PaymentGatewaySettingsDto>('/api/v1/admin/payments/gateway-settings');
  }

  updatePaymentGatewaySettings(request: UpdatePaymentGatewaySettingsRequest): Observable<PaymentGatewaySettingsDto> {
    return this.http.put<PaymentGatewaySettingsDto>('/api/v1/admin/payments/gateway-settings', request);
  }

  uploadBinanceQrImage(file: File): Observable<{ qrImageUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ qrImageUrl: string }>('/api/v1/admin/payments/gateway-settings/binance-qr', formData);
  }
}
