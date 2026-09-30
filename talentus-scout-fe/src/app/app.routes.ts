import { Routes } from '@angular/router';
import { LandingComponent } from './features/landing/landing.component';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterTutorComponent } from './features/auth/register-tutor/register-tutor.component';
import { TutorDashboardComponent } from './features/dashboard/tutor-dashboard.component';
import { authGuard } from './core/auth/auth.guard';

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
    title: 'Registro de Tutor Legal (LOPNNA) — Talentus Scout'
  },
  {
    path: 'dashboard',
    component: TutorDashboardComponent,
    canActivate: [authGuard],
    title: 'Panel del Tutor — Talentus Scout'
  },
  {
    path: '**',
    redirectTo: ''
  }
];
