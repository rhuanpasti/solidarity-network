import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AdministratorRole } from '@solidarity-network/shared';
import { AuthService } from '../auth/auth.service';
import { LanguageService } from '../i18n/language.service';
import { LanguageSwitcherComponent } from '../../shared/components/language-switcher/language-switcher.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, TranslateModule, LanguageSwitcherComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayoutComponent {
  private readonly languageService = inject(LanguageService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly currentLanguage = computed(() => this.languageService.currentLanguage());
  readonly session = this.authService.currentUser;
  readonly mobileNavigationOpen = signal(false);
  readonly isAdministrator = computed(
    () => this.session()?.accountType === 'administrator',
  );
  readonly canManageAdministrators = computed(
    () =>
      this.session()?.accountType === 'administrator' &&
      this.session()?.role === AdministratorRole.SuperAdmin,
  );

  readonly navigationItems = computed(() =>
    this.isAdministrator()
      ? [
          { path: '/dashboard', labelKey: 'navigation.dashboard', icon: 'space_dashboard' },
          { path: '/charity-programs', labelKey: 'navigation.charityPrograms', icon: 'layers' },
          ...(this.canManageAdministrators()
            ? [
                {
                  path: '/administrators',
                  labelKey: 'navigation.administrators',
                  icon: 'manage_accounts',
                },
              ]
            : []),
          { path: '/beneficiaries', labelKey: 'navigation.beneficiaries', icon: 'groups' },
          { path: '/benefits', labelKey: 'navigation.benefits', icon: 'inventory_2' },
          {
            path: '/benefit-deliveries',
            labelKey: 'navigation.benefitDeliveries',
            icon: 'local_shipping',
          },
        ]
      : [
          {
            path: '/my-programs',
            labelKey: 'navigation.myPrograms',
            icon: 'event_available',
          },
        ],
  );

  goToDashboard() {
    this.router.navigate(['/dashboard']);
    this.closeMobileNavigation();
  }

  setLanguage(language: string) {
    this.languageService.setLanguage(language);
  }

  toggleMobileNavigation() {
    this.mobileNavigationOpen.update((current) => !current);
  }

  closeMobileNavigation() {
    this.mobileNavigationOpen.set(false);
  }

  logout() {
    void this.authService.logout();
    this.closeMobileNavigation();
    void this.router.navigate(['/login']);
  }
}
