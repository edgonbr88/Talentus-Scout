import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe, DOCUMENT } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { AthleteService } from '../../core/services/athlete.service';
import { VideoUploadService } from '../../core/services/video-upload.service';
import { AthleteSummary } from '../../core/models/athlete.model';
import { AthleteVideoResponse } from '../../core/models/video.model';
import { VideoUploaderComponent } from '../videos/video-uploader.component';
import { RequestCertificationModalComponent } from '../certification/request-certification-modal.component';
import { CheckoutPagoMovilModalComponent } from '../payments/checkout-pago-movil-modal.component';
import { TutorRadarMetricsResponse } from '../../core/models/scout-contact.model';
import { PaymentTransactionResponse } from '../../core/models/payment.model';

import { FormsModule } from '@angular/forms';
import { RegisterAthleteModalComponent } from './register-athlete-modal/register-athlete-modal.component';
import { MediaUrlPipe } from '../../core/pipes/media-url.pipe';

@Component({
  selector: 'app-tutor-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, VideoUploaderComponent, RequestCertificationModalComponent, CheckoutPagoMovilModalComponent, RegisterAthleteModalComponent, MediaUrlPipe],
  templateUrl: './tutor-dashboard.component.html',
  styles: [`
    .dashboard-page {
      padding: 40px 20px 80px;
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
      margin-bottom: 36px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--color-border);
    }

    .header-badges {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }

    .dashboard-title {
      font-size: 26px;
      margin-bottom: 8px;
    }

    .dashboard-subtitle {
      font-size: 15px;
      color: var(--color-text-muted);
    }

    .header-actions {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .btn-upload-header {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .btn-upload-header:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      filter: grayscale(0.6);
    }

    .btn-icon {
      width: 16px;
      height: 16px;
    }

    /* TOAST DE ÉXITO */
    .upload-success-toast {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid #10B981;
      color: #10B981;
      padding: 12px 18px;
      border-radius: 8px;
      margin-bottom: 24px;
      font-weight: 600;
      font-size: 14px;
    }

    .toast-close {
      background: none;
      border: none;
      color: #10B981;
      font-size: 16px;
      cursor: pointer;
    }

    /* CABECERA DE ATLETAS */
    .card-top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 16px;
    }

    .title-with-badge {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .title-with-badge h3 {
      margin: 0;
      font-size: 1.25rem;
    }

    /* LISTA DE ATLETAS */
    .athletes-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin-top: 14px;
    }

    .athlete-card {
      display: flex;
      flex-direction: column;
      gap: 14px;
      background-color: #0E1527;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      padding: 18px 20px;
      transition: border-color var(--transition-fast), background-color var(--transition-fast);
    }

    .athlete-card:hover {
      border-color: #33476B;
    }

    /* NIVEL 1: BLOQUE SUPERIOR DE IDENTIDAD Y DATOS FORMATIVOS */
    .athlete-header-row {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      width: 100%;
    }

    .athlete-avatar {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: #1E293B;
      border: 2px solid #334155;
      color: #10B981;
      font-weight: 700;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
    }

    .athlete-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .athlete-avatar.athlete-avatar-clickable {
      cursor: pointer;
      position: relative;
      transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .athlete-avatar.athlete-avatar-clickable:hover {
      transform: scale(1.06);
      border-color: #10B981;
      box-shadow: 0 0 12px rgba(16, 185, 129, 0.35);
    }

    .avatar-camera-overlay {
      position: absolute;
      inset: 0;
      background: rgba(15, 23, 42, 0.75);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .athlete-avatar.athlete-avatar-clickable:hover .avatar-camera-overlay {
      opacity: 1;
    }

    .btn-photo {
      background: rgba(56, 189, 248, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.35);
      color: #38bdf8;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }

    .btn-photo:hover {
      background: rgba(56, 189, 248, 0.22);
      border-color: #38bdf8;
      color: #7dd3fc;
    }

    .athlete-main-info {
      flex: 1;
      min-width: 0;
    }

    .athlete-name {
      font-size: 16px;
      font-weight: 700;
      color: #F8FAFC;
      margin: 0 0 4px;
      letter-spacing: -0.01em;
      line-height: 1.3;
      word-break: break-word;
    }

    .athlete-badges-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin: 4px 0 8px;
      align-items: center;
    }

    .athlete-specs {
      font-size: 13px;
      color: var(--color-text-muted);
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
    }

    .spec-dot {
      color: var(--color-text-dim);
    }

    .btn-sm {
      padding: 6px 12px;
      font-size: 12px;
    }

    /* NIVEL 2: BARRA INFERIOR DE ACCIONES */
    .athlete-actions-bar,
    .athlete-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 14px;
      margin-top: 2px;
      width: 100%;
    }

    .btn-action-pro {
      background-color: var(--color-accent-pitch);
      color: #042F1A;
      font-weight: 700;
      border-color: var(--color-accent-pitch);
    }

    .btn-action-pro:hover:not(:disabled) {
      background-color: var(--color-accent-pitch-hover);
      color: #FFFFFF;
    }

    .btn-action-pro.btn-renew {
      background-color: rgba(16, 185, 129, 0.12);
      color: #34D399;
      border-color: rgba(16, 185, 129, 0.4);
    }

    .btn-action-pro.btn-renew:hover:not(:disabled) {
      background-color: #10B981;
      color: #042F1A;
    }

    .btn-video {
      border-color: var(--color-border);
      color: var(--color-text-main);
    }

    .btn-video-locked {
      background: rgba(30, 41, 59, 0.65);
      border: 1px dashed rgba(245, 158, 11, 0.45) !important;
      color: #FCD34D !important;
      transition: all 0.2s ease;
    }

    .btn-video-locked:hover {
      background: rgba(245, 158, 11, 0.12) !important;
      border-color: #F59E0B !important;
      color: #FEF08A !important;
      transform: translateY(-1px);
    }

    .btn-download-cv {
      border-color: rgba(16, 185, 129, 0.4);
      color: #34D399;
    }

    .btn-download-cv:hover:not(:disabled) {
      background: rgba(16, 185, 129, 0.12);
      border-color: #10B981;
    }

    .btn-certify {
      border-color: rgba(56, 189, 248, 0.4);
      color: #38BDF8;
    }

    .btn-certify:hover {
      background: rgba(56, 189, 248, 0.12);
      border-color: #38BDF8;
    }

    .btn-doc {
      border-color: rgba(56, 189, 248, 0.4);
      color: #38bdf8;
    }

    .btn-doc:hover {
      background: rgba(56, 189, 248, 0.12);
      border-color: #38bdf8;
    }

    .badge-pro-active {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid #10b981;
      color: #34d399;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: var(--radius-full);
    }

    .badge-pending-audit {
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid #f59e0b;
      color: #fbbf24;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: var(--radius-full);
    }

    .badge-inactive {
      background: rgba(100, 116, 139, 0.2);
      border: 1px solid #475569;
      color: #94a3b8;
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: var(--radius-full);
    }

    .badge-doc-verified, .badge-legal-approved {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid #10b981;
      color: #34d399;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: var(--radius-full);
    }

    .badge-doc-pending, .badge-legal-pending {
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid #f59e0b;
      color: #fbbf24;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: var(--radius-full);
    }

    .badge-legal-rejected {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid #ef4444;
      color: #f87171;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: var(--radius-full);
    }

    .legal-rejection-banner {
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.25);
      border-radius: 8px;
      padding: 10px 14px;
      margin-top: 10px;
      flex-wrap: wrap;
    }

    .rejection-banner-icon {
      font-size: 18px;
    }

    .rejection-banner-text {
      flex: 1;
      min-width: 200px;
    }

    .rejection-banner-title {
      font-size: 11px;
      font-weight: 700;
      color: #f87171;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      display: block;
    }

    .rejection-banner-desc {
      font-size: 12px;
      color: #cbd5e1;
      margin: 2px 0 0 0;
      line-height: 1.3;
    }

    .btn-warning-action {
      background: #f59e0b;
      color: #78350f;
      font-weight: 700;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 11px;
      transition: background 0.2s ease;
    }

    .btn-warning-action:hover {
      background: #fbbf24;
    }

    /* TS-39: BANNER GLOBAL Y CHECKLIST DE VISIBILIDAD EN DIRECTORIO */
    .global-visibility-alert-banner {
      background: rgba(245, 158, 11, 0.08);
      border: 1px solid rgba(245, 158, 11, 0.35);
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 20px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .alert-banner-header {
      display: flex;
      align-items: flex-start;
      gap: 14px;
    }

    .alert-banner-icon {
      font-size: 24px;
      line-height: 1;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .alert-banner-content {
      flex: 1;
    }

    .alert-banner-title {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 4px;
    }

    .alert-banner-title strong {
      font-size: 14px;
      font-weight: 700;
      color: #fbbf24;
      letter-spacing: -0.01em;
    }

    .badge-alert-count {
      background: rgba(245, 158, 11, 0.2);
      border: 1px solid #f59e0b;
      color: #fef3c7;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: var(--radius-full);
      text-transform: uppercase;
    }

    .alert-banner-desc {
      font-size: 13px;
      color: #cbd5e1;
      margin: 0;
      line-height: 1.45;
    }

    .visibility-checklist-card {
      background: rgba(15, 23, 42, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 10px;
      padding: 14px 16px;
      margin: 12px 0 10px;
    }

    .checklist-header {
      margin-bottom: 10px;
    }

    .checklist-title {
      font-size: 13px;
      font-weight: 700;
      color: #f59e0b;
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 2px;
    }

    .checklist-subtitle {
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.4;
      margin: 0;
    }

    .visibility-checklist-items {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .checklist-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 12px;
      transition: background 0.15s ease;
      flex-wrap: wrap;
    }

    .checklist-item.is-completed {
      background: rgba(16, 185, 129, 0.06);
      border: 1px solid rgba(16, 185, 129, 0.2);
      color: #a7f3d0;
    }

    .checklist-item.is-pending {
      background: rgba(245, 158, 11, 0.08);
      border: 1px solid rgba(245, 158, 11, 0.25);
      color: #fde68a;
    }

    .checklist-item.is-recommendation {
      background: rgba(56, 189, 248, 0.06);
      border: 1px solid rgba(56, 189, 248, 0.2);
      color: #bae6fd;
    }

    .item-left {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      min-width: 220px;
    }

    .item-icon {
      font-size: 14px;
      flex-shrink: 0;
    }

    .item-text {
      line-height: 1.35;
    }

    .visibility-status-active {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
      font-size: 12px;
      font-weight: 600;
      padding: 8px 14px;
      border-radius: 8px;
      margin: 10px 0 8px;
    }

    .visibility-status-active .active-dot {
      color: #10b981;
      font-size: 10px;
      animation: pulse-dot 2s infinite ease-in-out;
    }

    @keyframes pulse-dot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }

    .identity-modal-box {
      max-width: 540px;
      width: 100%;
      max-height: min(90vh, 720px);
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      padding: 0;
    }

    .identity-modal-box .modal-header {
      padding: 20px 24px 14px;
      border-bottom: 1px solid #1e293b;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-shrink: 0;
    }

    .identity-modal-box .modal-body {
      padding: 20px 24px;
      overflow-y: auto;
      overscroll-behavior: contain;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .identity-modal-box .modal-footer {
      padding: 16px 24px;
      border-top: 1px solid #1e293b;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      flex-shrink: 0;
      background: rgba(15, 23, 42, 0.95);
    }

    .photo-modal-box {
      max-width: 520px;
      width: 100%;
      max-height: min(90vh, 760px);
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      padding: 0;
    }

    .photo-modal-box .modal-header {
      padding: 20px 24px 14px;
      border-bottom: 1px solid #1e293b;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-shrink: 0;
    }

    .photo-modal-box .modal-body {
      padding: 20px 24px;
      overflow-y: auto;
      overscroll-behavior: contain;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .photo-modal-box .modal-footer {
      padding: 16px 24px;
      border-top: 1px solid #1e293b;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
      background: rgba(15, 23, 42, 0.95);
    }

    .photo-preview-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 18px;
      background: #0B1120;
      border: 1px solid #1E293B;
      border-radius: 12px;
    }

    .photo-preview-avatar {
      width: 108px;
      height: 108px;
      border-radius: 50%;
      border: 3px solid #10B981;
      overflow: hidden;
      background: #1E293B;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 34px;
      font-weight: 700;
      color: #10B981;
      box-shadow: 0 4px 16px rgba(16, 185, 129, 0.25);
    }

    .photo-preview-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .photo-preview-caption {
      font-size: 12px;
      color: #94A3B8;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .photo-legal-notice {
      display: flex;
      gap: 12px;
      background: rgba(30, 41, 59, 0.7);
      border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 10px;
      padding: 12px 14px;
      font-size: 0.82rem;
      color: #cbd5e1;
      line-height: 1.45;
    }

    .photo-legal-notice .legal-icon {
      font-size: 20px;
      flex-shrink: 0;
    }

    .photo-delete-confirm-box {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.4);
      border-radius: 10px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .photo-delete-confirm-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    .btn-danger-action {
      background: #ef4444;
      color: #ffffff;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .btn-danger-action:hover {
      background: #dc2626;
    }

    .btn-danger-outline {
      background: transparent;
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.4);
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-danger-outline:hover {
      background: rgba(239, 68, 68, 0.15);
      border-color: #ef4444;
    }

    .file-dropzone {
      border: 2px dashed #334155;
      border-radius: 10px;
      padding: 18px;
      text-align: center;
      cursor: pointer;
      background: #0b1120;
      transition: all 0.2s ease;
    }

    .file-dropzone:hover {
      border-color: #38bdf8;
      background: rgba(56, 189, 248, 0.05);
    }

    .file-dropzone.is-dragging {
      border-color: #38bdf8;
      border-style: solid;
      background: rgba(56, 189, 248, 0.12);
      transform: scale(1.01);
      box-shadow: 0 0 15px rgba(56, 189, 248, 0.15);
    }

    .file-dropzone.has-file {
      border-style: solid;
      border-color: #10b981;
      background: rgba(16, 185, 129, 0.08);
    }

    .file-dropzone.is-invalid {
      border-color: #ef4444;
      background: rgba(239, 68, 68, 0.06);
    }

    .dropzone-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }

    .upload-icon {
      width: 28px;
      height: 28px;
      color: #64748b;
      margin-bottom: 2px;
    }

    .dropzone-text {
      font-size: 13px;
      font-weight: 600;
      color: #38bdf8;
    }

    .dropzone-hint {
      font-size: 11px;
      color: #64748b;
    }

    .dropzone-file {
      display: flex;
      align-items: center;
      gap: 12px;
      text-align: left;
    }

    .file-icon {
      width: 28px;
      height: 28px;
      color: #10b981;
      flex-shrink: 0;
    }

    .file-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-width: 0;
    }

    .file-name {
      font-size: 13px;
      font-weight: 600;
      color: #f8fafc;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .file-size {
      font-size: 11px;
      color: #94a3b8;
    }

    .btn-remove-file {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 16px;
      cursor: pointer;
      padding: 4px;
      line-height: 1;
      border-radius: 4px;
      transition: color 0.15s ease, background-color 0.15s ease;
    }

    .btn-remove-file:hover {
      color: #ef4444;
      background: rgba(239, 68, 68, 0.1);
    }

    /* GALERÍA DE VIDEOS */
    .videos-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px;
      margin-top: 16px;
    }

    .video-preview-tile {
      background: #0E1527;
      border: 1px solid var(--color-border);
      border-radius: 8px;
      overflow: hidden;
    }

    .video-thumb-container {
      position: relative;
      width: 100%;
      height: 120px;
      background: #000;
    }

    .video-tile-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .video-tile-empty {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    }

    .video-tile-status {
      position: absolute;
      top: 6px;
      right: 6px;
      background: rgba(16, 185, 129, 0.85);
      color: #fff;
      font-size: 9px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .video-tile-content {
      padding: 10px 12px;
    }

    .video-tile-cat {
      font-size: 10px;
      font-weight: 700;
      color: #10B981;
      display: block;
      margin-bottom: 2px;
    }

    .video-tile-title {
      font-size: 13px;
      font-weight: 600;
      color: #F8FAFC;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* MODAL */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }

    .modal-container {
      width: 100%;
      max-width: 620px;
      animation: modalFadeIn 0.2s ease-out;
    }

    .selector-modal {
      max-width: 520px;
    }

    .modal-header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--color-border);
    }

    .selector-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #F8FAFC;
      margin-bottom: 4px;
    }

    .selector-subtitle {
      font-size: 0.85rem;
      color: var(--color-text-muted);
      margin: 0;
    }

    .btn-close-modal {
      background: transparent;
      border: none;
      color: var(--color-text-muted);
      font-size: 18px;
      cursor: pointer;
      line-height: 1;
      padding: 4px;
      border-radius: 4px;
      transition: color 0.15s ease;
    }

    .btn-close-modal:hover {
      color: #F8FAFC;
    }

    .athlete-selector-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-height: 380px;
      overflow-y: auto;
    }

    .athlete-select-option {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 14px;
      background: #0E1527;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all 0.15s ease-in-out;
    }

    .athlete-select-option:hover {
      background: #151F36;
      border-color: #10B981;
      transform: translateX(3px);
    }

    .athlete-option-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .option-name {
      font-size: 0.95rem;
      font-weight: 600;
      color: #F8FAFC;
    }

    .option-meta {
      font-size: 0.8rem;
      color: var(--color-text-muted);
    }

    .select-badge {
      font-size: 0.8rem;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 6px;
      white-space: nowrap;
    }

    .select-badge.pro-badge {
      color: #10B981;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.25);
    }

    .select-badge.locked-badge {
      color: #FCD34D;
      background: rgba(245, 158, 11, 0.12);
      border: 1px dashed rgba(245, 158, 11, 0.35);
    }

    @keyframes modalFadeIn {
      from {
        opacity: 0;
        transform: translateY(12px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .col-span-12 {
      grid-column: span 12;
    }

    @media (min-width: 768px) {
      .md-col-8 {
        grid-column: span 8;
      }
      .md-col-4 {
        grid-column: span 4;
      }
      .md-col-6 {
        grid-column: span 6;
      }
    }

    .empty-state-box {
      background-color: #0E1527;
      border: 1px dashed var(--color-border);
      border-radius: var(--radius-sm);
      padding: 40px 20px;
      text-align: center;
      margin-top: 14px;
    }

    .empty-icon {
      font-size: 32px;
      margin-bottom: 12px;
    }

    .empty-state-box h4 {
      font-size: 17px;
      margin-bottom: 8px;
    }

    .empty-state-box p {
      font-size: 13px;
      margin: 0 auto 20px;
      max-width: 50ch;
    }

    .empty-action {
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .status-summary {
      display: flex;
      flex-direction: column;
      gap: 12px;
      background-color: #0E1527;
      padding: 16px;
      border-radius: var(--radius-sm);
      margin-bottom: 16px;
      border: 1px solid var(--color-border);
    }

    .status-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
    }

    .status-label {
      color: var(--color-text-muted);
    }

    .status-value {
      font-weight: 600;
      color: var(--color-text-main);
    }

    .legal-info {
      font-size: 12px;
      color: var(--color-text-muted);
      line-height: 1.5;
    }

    .radar-desc {
      font-size: 13px;
      margin-bottom: 16px;
    }

    .radar-stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 16px;
    }

    .radar-stat-box {
      background-color: #0E1527;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      padding: 12px 8px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }

    .radar-stat-box.highlight-contact {
      border-color: rgba(37, 211, 102, 0.35);
      background: rgba(37, 211, 102, 0.06);
    }

    .stat-number {
      font-family: var(--font-family-display);
      font-size: 20px;
      font-weight: 700;
      color: var(--color-accent-pitch);
    }

    .radar-stat-box.highlight-contact .stat-number {
      color: #25D366;
    }

    .stat-caption {
      font-size: 10px;
      color: var(--color-text-dim);
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.04em;
      line-height: 1.2;
    }

    .radar-feed-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 12px;
    }

    .feed-title {
      font-size: 11px;
      color: var(--color-text-dim);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 4px;
      font-weight: 700;
    }

    .radar-feed-item {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #0E1527;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      padding: 10px 12px;
    }

    .scout-icon-avatar {
      font-size: 18px;
      flex-shrink: 0;
    }

    .scout-feed-content {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .feed-main-line {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .scout-name {
      font-size: 13px;
      color: var(--color-text-main);
    }

    .scout-club-pill {
      font-size: 10px;
      font-weight: 600;
      background: rgba(59, 130, 246, 0.15);
      color: #60A5FA;
      border: 1px solid rgba(59, 130, 246, 0.3);
      padding: 2px 6px;
      border-radius: var(--radius-sm);
    }

    .feed-sub-line {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      font-size: 11px;
      color: var(--color-text-muted);
    }

    .feed-time {
      font-size: 10px;
      color: var(--color-text-dim);
      white-space: nowrap;
    }

    .radar-empty {
      padding: 20px;
      background-color: #0E1527;
      border-radius: var(--radius-sm);
      text-align: center;
      font-size: 13px;
      color: var(--color-text-dim);
      border: 1px solid var(--color-border);
    }

    .user-details-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .detail-item {
      display: flex;
      justify-content: space-between;
      padding: 10px 14px;
      background-color: #0E1527;
      border-radius: var(--radius-sm);
      font-size: 13px;
      border: 1px solid var(--color-border);
    }

    .detail-key {
      color: var(--color-text-muted);
    }

    .detail-val {
      font-weight: 600;
      color: var(--color-text-main);
    }

    @media (max-width: 768px) {
      .card-top-bar {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }

      .card-top-bar .btn {
        width: 100%;
        justify-content: center;
      }

      .athlete-header-row {
        gap: 12px;
      }

      .athlete-actions-bar,
      .athlete-actions {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
      }

      .athlete-actions-bar .btn,
      .athlete-actions .btn {
        width: 100%;
        min-height: 38px;
        justify-content: center;
      }
    }

    @media (max-width: 640px) {
      .dashboard-header {
        flex-direction: column;
      }
    }

    @media (max-width: 480px) {
      .athlete-actions-bar,
      .athlete-actions {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class TutorDashboardComponent implements OnInit, OnDestroy {
  authService = inject(AuthService);
  athleteService = inject(AthleteService);
  videoUploadService = inject(VideoUploadService);
  private document = inject(DOCUMENT);

  athletes: AthleteSummary[] = [];
  recentVideos: AthleteVideoResponse[] = [];
  radarMetrics: TutorRadarMetricsResponse | null = null;
  isLoadingRadar = false;

  showVideoModal = false;
  activeAthleteId = '';
  activeAthleteName = '';
  lastUploadedNotice: string | null = null;
  downloadingCvAthleteId: string | null = null;

  showCertModal = false;
  certAthleteId = '';
  certAthleteName = '';

  showCheckoutModal = false;
  selectedAthleteForCheckout: AthleteSummary | null = null;

  showIdentityModal = false;
  selectedAthleteForIdentity: AthleteSummary | null = null;
  identityDocType = 'PARTIDA_NACIMIENTO';
  identityDocNumber = '';
  identityFile: File | null = null;
  isUploadingIdentity = false;
  identityUploadError: string | null = null;
  isDraggingDoc = false;

  showPhotoModal = false;
  selectedAthleteForPhoto: AthleteSummary | null = null;
  photoFile: File | null = null;
  photoPreviewUrl: string | null = null;
  isUploadingPhoto = false;
  photoUploadError: string | null = null;
  isDraggingPhoto = false;
  showDeletePhotoConfirm = false;
  isDeletingPhoto = false;

  ngOnInit(): void {
    if (!this.authService.currentUser() && this.authService.token()) {
      this.authService.fetchCurrentUser().subscribe({
        next: () => {
          this.loadAthletes();
          this.loadRadarMetrics();
        }
      });
    } else {
      this.loadAthletes();
      this.loadRadarMetrics();
    }
  }

  loadRadarMetrics(): void {
    this.isLoadingRadar = true;
    this.athleteService.getTutorRadarMetrics().subscribe({
      next: (metrics) => {
        this.radarMetrics = metrics;
        this.isLoadingRadar = false;
      },
      error: () => {
        this.isLoadingRadar = false;
      }
    });
  }

  loadAthletes(): void {
    this.athleteService.getMyAthletes().subscribe({
      next: (athletes) => {
        this.athletes = athletes || [];
        if (this.athletes.length > 0) {
          this.loadVideosForAthlete(this.athletes[0].id);
        }
      },
      error: () => {
        // Fallback resiliente si aún no hay atletas creados
        this.athletes = [];
      }
    });
  }

  loadVideosForAthlete(athleteId: string): void {
    this.videoUploadService.getVideosByAthlete(athleteId).subscribe({
      next: (videos) => {
        this.recentVideos = videos || [];
      },
      error: () => {
        this.recentVideos = [];
      }
    });
  }

  handleVideoUploadAction(athlete: AthleteSummary): void {
    if (athlete.subscriptionStatus !== 'ACTIVE') {
      this.lastUploadedNotice = `Para subir videos de ${athlete.fullName}, activa su membresía Pro.`;
      this.openCheckoutModal(athlete);
      return;
    }
    this.openVideoUploaderForAthlete(athlete);
  }

  openVideoUploaderForAthlete(athlete: AthleteSummary): void {
    this.activeAthleteId = athlete.id;
    this.activeAthleteName = athlete.fullName;
    this.showVideoModal = true;
  }

  showAthleteSelectorModal = false;

  openQuickVideoUploader(): void {
    if (this.athletes.length === 0) {
      return;
    }
    if (this.athletes.length === 1) {
      this.handleVideoUploadAction(this.athletes[0]);
    } else {
      this.showAthleteSelectorModal = true;
    }
  }

  selectAthleteForVideo(athlete: AthleteSummary): void {
    this.showAthleteSelectorModal = false;
    this.handleVideoUploadAction(athlete);
  }

  closeAthleteSelectorModal(): void {
    this.showAthleteSelectorModal = false;
  }

  closeVideoModal(): void {
    this.showVideoModal = false;
  }

  handleVideoUploaded(video: AthleteVideoResponse): void {
    this.lastUploadedNotice = `Video "${video.title}" subido y optimizado con éxito.`;
    this.recentVideos.unshift(video);
    this.closeVideoModal();
  }

  isAthleteVisible(athlete: AthleteSummary): boolean {
    return athlete.subscriptionStatus === 'ACTIVE' && !!athlete.hasIdentityDocument;
  }

  hasNonVisibleAthletes(): boolean {
    return this.athletes.length > 0 && this.athletes.some(a => !this.isAthleteVisible(a));
  }

  getNonVisibleCount(): number {
    return this.athletes.filter(a => !this.isAthleteVisible(a)).length;
  }

  showAthleteModal = false;

  openAthleteModal(): void {
    this.showAthleteModal = true;
  }

  closeAthleteModal(): void {
    this.showAthleteModal = false;
  }

  onAthleteCreated(newAthlete: AthleteSummary): void {
    this.showAthleteModal = false;
    this.lastUploadedNotice = `Cédula deportiva oficial de "${newAthlete.fullName}" creada con éxito.`;
    this.loadAthletes();
  }

  openCertificationModal(athlete: AthleteSummary): void {
    this.certAthleteId = athlete.id;
    this.certAthleteName = athlete.fullName;
    this.showCertModal = true;
  }

  closeCertificationModal(): void {
    this.showCertModal = false;
  }

  onCertificationCreated(): void {
    this.lastUploadedNotice = 'Solicitud de certificación procesada exitosamente.';
    this.loadAthletes();
  }

  openCheckoutModal(athlete: AthleteSummary): void {
    this.selectedAthleteForCheckout = athlete;
    this.showCheckoutModal = true;
  }

  closeCheckoutModal(): void {
    this.showCheckoutModal = false;
    this.selectedAthleteForCheckout = null;
  }

  onPaymentReported(tx: PaymentTransactionResponse): void {
    this.lastUploadedNotice = `Pago Móvil reportado con éxito (Ref: #${tx.referenceNumber}). Quedará activo al ser conciliado por administración.`;
    this.closeCheckoutModal();
    this.loadAthletes();
  }

  isDownloadingCv(athleteId: string): boolean {
    return this.downloadingCvAthleteId === athleteId;
  }

  downloadCv(athlete: AthleteSummary): void {
    if (this.downloadingCvAthleteId) return;
    this.downloadingCvAthleteId = athlete.id;

    this.athleteService.downloadAthleteCvPdf(athlete.id).subscribe({
      next: (blob) => {
        this.downloadingCvAthleteId = null;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CV_Deportivo_${athlete.slug || athlete.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.downloadingCvAthleteId = null;
        console.error('Error al descargar el CV:', err);
        alert('No se pudo generar el CV en PDF en este momento. Por favor verifica tus permisos o intenta nuevamente.');
      }
    });
  }

  ngOnDestroy(): void {
    if (this.document?.body) {
      this.document.body.style.overflow = '';
    }
  }

  openIdentityModal(athlete: AthleteSummary): void {
    this.selectedAthleteForIdentity = athlete;
    this.identityDocType = athlete.identityDocumentType || 'PARTIDA_NACIMIENTO';
    this.identityDocNumber = athlete.identityDocumentNumber || '';
    this.identityFile = null;
    this.identityUploadError = null;
    this.isDraggingDoc = false;
    this.showIdentityModal = true;
    if (this.document?.body) {
      this.document.body.style.overflow = 'hidden';
    }
  }

  closeIdentityModal(): void {
    this.showIdentityModal = false;
    this.selectedAthleteForIdentity = null;
    this.identityFile = null;
    this.identityUploadError = null;
    this.isDraggingDoc = false;
    if (this.document?.body) {
      this.document.body.style.overflow = '';
    }
  }

  onIdentityFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleIdentityFile(input.files[0]);
    }
  }

  onDocDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingDoc = true;
  }

  onDocDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingDoc = false;
  }

  onDocDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingDoc = false;

    if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      this.handleIdentityFile(file);
    }
  }

  handleIdentityFile(file: File): void {
    const maxBytes = 5 * 1024 * 1024;
    const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg'];
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowedExtensions.includes(fileExt)) {
      this.identityUploadError = 'Formato no permitido. Solo se aceptan archivos PDF, PNG o JPG.';
      this.identityFile = null;
      return;
    }

    if (file.size > maxBytes) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      this.identityUploadError = `El archivo seleccionado (${sizeMb} MB) supera el límite máximo permitido de 5MB. Por favor selecciona un documento más liviano o comprimido.`;
      this.identityFile = null;
      return;
    }

    this.identityUploadError = null;
    this.identityFile = file;
  }

  get canSaveIdentityDocument(): boolean {
    return !!this.identityDocType &&
           !!this.identityDocNumber?.trim() &&
           !!this.identityFile &&
           this.identityFile.size <= 5 * 1024 * 1024 &&
           !this.isUploadingIdentity;
  }

  removeIdentityFile(event: Event, fileInput?: HTMLInputElement): void {
    event.stopPropagation();
    this.identityFile = null;
    this.identityUploadError = null;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  saveIdentityDocument(): void {
    if (!this.selectedAthleteForIdentity || !this.identityFile) return;

    this.isUploadingIdentity = true;
    this.identityUploadError = null;

    const formData = new FormData();
    formData.append('documentType', this.identityDocType);
    formData.append('documentNumber', this.identityDocNumber || 'SIN_NUMERO');
    formData.append('file', this.identityFile);

    this.athleteService.uploadIdentityDocument(this.selectedAthleteForIdentity.id, formData).subscribe({
      next: (updated) => {
        this.isUploadingIdentity = false;
        this.lastUploadedNotice = `Documento de identidad consignado con éxito para ${updated.fullName}.`;
        this.closeIdentityModal();
        this.loadAthletes();
      },
      error: (err) => {
        this.isUploadingIdentity = false;
        this.identityUploadError = err.error?.message || 'Error al subir el documento. Intenta nuevamente.';
      }
    });
  }

  openPhotoModal(athlete: AthleteSummary): void {
    this.selectedAthleteForPhoto = athlete;
    this.photoFile = null;
    this.photoPreviewUrl = athlete.profilePhotoUrl || null;
    this.photoUploadError = null;
    this.isDraggingPhoto = false;
    this.showDeletePhotoConfirm = false;
    this.showPhotoModal = true;
    if (this.document?.body) {
      this.document.body.style.overflow = 'hidden';
    }
  }

  closePhotoModal(): void {
    this.showPhotoModal = false;
    this.selectedAthleteForPhoto = null;
    this.photoFile = null;
    this.photoPreviewUrl = null;
    this.photoUploadError = null;
    this.isDraggingPhoto = false;
    this.showDeletePhotoConfirm = false;
    if (this.document?.body) {
      this.document.body.style.overflow = '';
    }
  }

  onPhotoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handlePhotoFile(input.files[0]);
    }
  }

  onPhotoDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingPhoto = true;
  }

  onPhotoDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingPhoto = false;
  }

  onPhotoDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingPhoto = false;

    if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      this.handlePhotoFile(file);
    }
  }

  handlePhotoFile(file: File): void {
    const maxBytes = 5 * 1024 * 1024;
    const allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowedExtensions.includes(fileExt)) {
      this.photoUploadError = 'Formato no permitido. Solo se aceptan imágenes PNG, JPG, JPEG o WEBP.';
      this.photoFile = null;
      return;
    }

    if (file.size > maxBytes) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      this.photoUploadError = `El archivo supera los 5MB permitidos (${sizeMb} MB). Por favor selecciona una imagen más liviana.`;
      this.photoFile = null;
      return;
    }

    this.photoUploadError = null;
    this.photoFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.photoPreviewUrl = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  removeSelectedPhotoFile(event: Event, fileInput?: HTMLInputElement): void {
    event.stopPropagation();
    this.photoFile = null;
    this.photoPreviewUrl = this.selectedAthleteForPhoto?.profilePhotoUrl || null;
    this.photoUploadError = null;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  savePhoto(): void {
    if (!this.selectedAthleteForPhoto || !this.photoFile) return;

    this.isUploadingPhoto = true;
    this.photoUploadError = null;

    this.athleteService.uploadAthletePhoto(this.selectedAthleteForPhoto.id, this.photoFile).subscribe({
      next: (updated) => {
        this.isUploadingPhoto = false;
        this.lastUploadedNotice = `Fotografía deportiva actualizada con éxito para ${updated.fullName}.`;
        this.closePhotoModal();
        this.loadAthletes();
      },
      error: (err) => {
        this.isUploadingPhoto = false;
        this.photoUploadError = err.error?.message || 'Error al subir la fotografía de perfil. Intenta nuevamente.';
      }
    });
  }

  confirmDeletePhoto(): void {
    this.showDeletePhotoConfirm = true;
  }

  cancelDeletePhoto(): void {
    this.showDeletePhotoConfirm = false;
  }

  deletePhoto(): void {
    if (!this.selectedAthleteForPhoto) return;

    this.isDeletingPhoto = true;
    this.photoUploadError = null;

    this.athleteService.deleteAthletePhoto(this.selectedAthleteForPhoto.id).subscribe({
      next: (updated) => {
        this.isDeletingPhoto = false;
        this.lastUploadedNotice = `Fotografía eliminada. Se restableció el avatar con iniciales para ${updated.fullName}.`;
        this.closePhotoModal();
        this.loadAthletes();
      },
      error: (err) => {
        this.isDeletingPhoto = false;
        this.photoUploadError = err.error?.message || 'Error al eliminar la fotografía. Intenta nuevamente.';
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
