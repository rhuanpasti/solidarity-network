import { Routes } from '@angular/router';
import { AdministratorRole } from '@solidarity-network/shared';
import { authGuard, loginGuard } from './core/auth/auth.guard';
import { AppLayoutComponent } from './core/layout/shell.component';

export const appRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    path: 'login',
    canActivate: [loginGuard],
    loadComponent: () => import('./features/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'first-access',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/first-access/first-access.page').then(
        (m) => m.FirstAccessPage,
      ),
  },
  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      {
        path: 'dashboard',
        data: {
          accountTypes: ['administrator'],
        },
        loadComponent: () =>
          import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'my-programs',
        data: {
          accountTypes: ['beneficiary'],
        },
        loadComponent: () =>
          import('./features/beneficiary-portal/beneficiary-portal.page').then(
            (m) => m.BeneficiaryPortalPage,
          ),
      },
      {
        path: 'charity-programs',
        data: {
          accountTypes: ['administrator'],
        },
        loadComponent: () =>
          import('./features/charity-programs/charity-programs.page').then(
            (m) => m.CharityProgramsPage,
          ),
      },
      {
        path: 'administrators',
        data: {
          accountTypes: ['administrator'],
          administratorRoles: [AdministratorRole.SuperAdmin],
        },
        loadComponent: () =>
          import('./features/administrators/administrators.page').then(
            (m) => m.AdministratorsPage,
          ),
      },
      {
        path: 'beneficiaries',
        data: {
          accountTypes: ['administrator'],
        },
        loadComponent: () =>
          import('./features/beneficiaries/beneficiaries.page').then(
            (m) => m.BeneficiariesPage,
          ),
      },
      {
        path: 'benefits',
        data: {
          accountTypes: ['administrator'],
        },
        loadComponent: () =>
          import('./features/benefits/benefits.page').then((m) => m.BenefitsPage),
      },
      {
        path: 'benefit-deliveries',
        data: {
          accountTypes: ['administrator'],
        },
        loadComponent: () =>
          import('./features/benefit-deliveries/benefit-deliveries.page').then(
            (m) => m.BenefitDeliveriesPage,
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
