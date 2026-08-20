import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { LanguageService } from '../../../core/i18n/language.service';
import { BackendAvailabilityService } from '../../../core/services/backend-availability.service';
import { ButtonComponent } from '../button/button.component';
import { LanguageSwitcherComponent } from '../language-switcher/language-switcher.component';

@Component({
  selector: 'app-backend-unavailable',
  standalone: true,
  imports: [TranslateModule, ButtonComponent, LanguageSwitcherComponent],
  template: `
    @if (backendAvailabilityService.isUnavailable()) {
      <section class="backend-unavailable" role="alert" aria-live="assertive">
        <div class="backend-unavailable-card">
          <div class="backend-unavailable-topbar">
            <app-language-switcher
              [currentLanguage]="currentLanguage()"
              (languageChange)="setLanguage($event)"
            />
          </div>
          <span class="material-symbols-rounded backend-unavailable-icon" aria-hidden="true">cloud_off</span>
          <p class="backend-unavailable-eyebrow">
            {{ 'common.backendUnavailableEyebrow' | translate }}
          </p>
          <h1>{{ 'common.backendUnavailableTitle' | translate }}</h1>
          <p class="backend-unavailable-description">
            {{ 'common.backendUnavailableDescription' | translate }}
          </p>

          @if (isDemoMode) {
            <p class="backend-unavailable-demo-disclaimer">
              {{ 'common.backendUnavailableDemoDisclaimer' | translate }}
            </p>
          }

          <div class="backend-unavailable-actions">
            <app-button type="button" variant="primary" (click)="backendAvailabilityService.retry()">
              {{ 'common.tryAgain' | translate }}
            </app-button>
            <app-button type="button" variant="secondary" (click)="goToLogin()">
              {{ 'common.goToLoginAnyway' | translate }}
            </app-button>
          </div>
        </div>
      </section>
    }
  `,
  styleUrl: './backend-unavailable.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackendUnavailableComponent {
  readonly backendAvailabilityService = inject(BackendAvailabilityService);
  private readonly router = inject(Router);
  private readonly languageService = inject(LanguageService);
  readonly currentLanguage = this.languageService.currentLanguage;
  readonly isDemoMode = environment.demoMode;

  setLanguage(language: string) {
    this.languageService.setLanguage(language);
  }

  goToLogin() {
    this.backendAvailabilityService.clear();
    void this.router.navigate(['/login'], { queryParams: { offline: 'true' } });
  }
}
