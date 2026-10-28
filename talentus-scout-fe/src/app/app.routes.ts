import { Routes } from '@angular/router';
import { LandingComponent } from './features/landing/landing.component';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterTutorComponent } from './features/auth/register-tutor/register-tutor.component';
import { TutorDashboardComponent } from './features/dashboard/tutor-dashboard.component';
import { BentoProfileComponent } from './features/public-profile/bento-profile.component';
import { authGuard } from './core/auth/auth.guard';
import { adminGuard } from './core/auth/admin.guard';
import { scoutGuard } from './core/auth/scout.guard';
import { tutorGuard } from './core/auth/tutor.guard';

export const routes: Routes = [
  {
    path: '',
    component: LandingComponent,
    title: 'Talentus Scout — Radar Oficial del Fútbol Juvenil'
  },
  {
    path: 'login',
    component: LoginComponent,
    title: 'Iniciar Sesión — Talentus Scout'
  },
  {
    path: 'register-tutor',
    component: RegisterTutorComponent,
    title: 'Registro de Tutor y Representante Legal — Talentus Scout'
  },
  {
    path: 'register-scout',
    loadComponent: () => import('./features/auth/register-scout/register-scout.component').then(m => m.RegisterScoutComponent),
    title: 'Registro y Acreditación de Scouts — Talentus Scout'
  },
  {
    path: 'auth/scout-pending-audit',
    loadComponent: () => import('./features/auth/scout-pending-audit/scout-pending-audit.component').then(m => m.ScoutPendingAuditComponent),
    title: 'Solicitud de Scout en Auditoría — Talentus Scout'
  },
  {
    path: 'auth/verify-email-pending',
    loadComponent: () => import('./features/auth/verify-email-pending/verify-email-pending.component').then(m => m.VerifyEmailPendingComponent),
    title: 'Verificación de Correo Pendiente — Talentus Scout'
  },
  {
    path: 'auth/verify-email',
    loadComponent: () => import('./features/auth/verify-email/verify-email.component').then(m => m.VerifyEmailComponent),
    title: 'Activación de Cuenta Oficial — Talentus Scout'
  },
  {
    path: 'auth/complete-profile',
    loadComponent: () => import('./features/auth/complete-profile/complete-profile.component').then(m => m.CompleteProfileComponent),
    title: 'Completar Perfil Oficial — Talentus Scout'
  },
  {
    path: 'auth/forgot-password',
    loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
    title: 'Recuperar Contraseña — Talentus Scout'
  },
  {
    path: 'auth/reset-password',
    loadComponent: () => import('./features/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent),
    title: 'Restablecer Contraseña Oficial — Talentus Scout'
  },
  {
    path: 'forgot-password',
    redirectTo: 'auth/forgot-password',
    pathMatch: 'full'
  },
  {
    path: 'reset-password',
    redirectTo: 'auth/reset-password',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    component: TutorDashboardComponent,
    canActivate: [authGuard, tutorGuard],
    title: 'Panel del Tutor — Talentus Scout'
  },
  {
    path: 'admin/scouts',
    loadComponent: () => import('./features/admin/scouts/admin-scouts.component').then(m => m.AdminScoutsComponent),
    canActivate: [authGuard, adminGuard],
    title: 'Auditoría de Scouts — Talentus Scout'
  },
  {
    path: 'admin/pagos',
    loadComponent: () => import('./features/admin/payments/admin-payments.component').then(m => m.AdminPaymentsComponent),
    canActivate: [authGuard, adminGuard],
    title: 'Auditoría de Pagos y Suscripciones — Talentus Scout'
  },
  {
    path: 'admin/verificacion-legal',
    loadComponent: () => import('./features/admin/legal-verification/admin-legal-verification.component').then(m => m.AdminLegalVerificationComponent),
    canActivate: [authGuard, adminGuard],
    title: 'Auditoría de Patria Potestad y Documentación Legal — Talentus Scout'
  },
  {
    path: 'admin/clubes',
    loadComponent: () => import('./features/admin/clubs/admin-clubs.component').then(m => m.AdminClubsComponent),
    canActivate: [authGuard, adminGuard],
    title: 'Mantenedor de Clubes y Organizaciones — Talentus Scout'
  },
  {
    path: 'scout/directory',
    loadComponent: () => import('./features/scout-directory/scout-directory.component').then(m => m.ScoutDirectoryComponent),
    canActivate: [authGuard, scoutGuard],
    title: 'Directorio de Búsqueda de Talentos — Talentus Scout'
  },
  {
    path: 'atleta/:slug',
    component: BentoProfileComponent,
    title: 'Ficha del Atleta — Talentus Scout'
  },
  {
    path: 'certify/:token',
    loadComponent: () => import('./features/certification/public-certifier.component').then(m => m.PublicCertifierComponent),
    title: 'Portal de Certificación Oficial — Talentus Scout'
  },
  {
    path: '**',
    redirectTo: ''
  }
];
