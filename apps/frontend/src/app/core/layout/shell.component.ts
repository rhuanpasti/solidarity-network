import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '../i18n/language.service';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'sn-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, TranslateModule],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellComponent {
  private readonly languageService = inject(LanguageService);
  readonly toastService = inject(ToastService);
  readonly currentLanguage = computed(() => this.languageService.currentLanguage());

  readonly navigationItems = [
    { path: '/dashboard', labelKey: 'navigation.dashboard' },
    { path: '/charity-programs', labelKey: 'navigation.charityPrograms' },
    { path: '/administrators', labelKey: 'navigation.administrators' },
    { path: '/beneficiaries', labelKey: 'navigation.beneficiaries' },
    { path: '/benefits', labelKey: 'navigation.benefits' },
    { path: '/benefit-deliveries', labelKey: 'navigation.benefitDeliveries' },
  ] as const;

  setLanguage(language: string) {
    this.languageService.setLanguage(language);
  }
}
