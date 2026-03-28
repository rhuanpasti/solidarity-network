import { Routes } from '@angular/router';

export const appRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'charity-programs',
    loadComponent: () =>
      import('./features/charity-programs/charity-programs.page').then(
        (m) => m.CharityProgramsPage,
      ),
  },
  {
    path: 'administrators',
    loadComponent: () =>
      import('./features/administrators/administrators.page').then(
        (m) => m.AdministratorsPage,
      ),
  },
  {
    path: 'beneficiaries',
    loadComponent: () =>
      import('./features/beneficiaries/beneficiaries.page').then(
        (m) => m.BeneficiariesPage,
      ),
  },
  {
    path: 'benefits',
    loadComponent: () =>
      import('./features/benefits/benefits.page').then((m) => m.BenefitsPage),
  },
  {
    path: 'benefit-deliveries',
    loadComponent: () =>
      import('./features/benefit-deliveries/benefit-deliveries.page').then(
        (m) => m.BenefitDeliveriesPage,
      ),
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];

