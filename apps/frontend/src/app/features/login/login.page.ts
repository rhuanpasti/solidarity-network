import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { merge } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import type { LoginMetricsResponse } from '@solidarity-network/shared';
import { catchError, of } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { LanguageService } from '../../core/i18n/language.service';
import { LoginMetricsService } from '../../core/services/login-metrics.service';
import { ToastService } from '../../core/services/toast.service';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { LanguageSwitcherComponent } from '../../shared/components/language-switcher/language-switcher.component';
import { PasswordFieldComponent } from '../../shared/components/password-field/password-field.component';
import { CheckboxFieldComponent } from '../../shared/components/checkbox-field/checkbox-field.component';
import { InputFieldComponent } from '../../shared/components/input-field/input-field.component';
import { touchAll } from '../../shared/utils/form.utils';

const EMPTY_LOGIN_METRICS: LoginMetricsResponse = {
  programs: 0,
  beneficiaries: 0,
  deliveries: 0,
};

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslateModule,
    DecimalPipe,
    ButtonComponent,
    InputFieldComponent,
    LanguageSwitcherComponent,
    PasswordFieldComponent,
    CheckboxFieldComponent,
  ],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly loginMetricsService = inject(LoginMetricsService);
  private readonly languageService = inject(LanguageService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly passwordVisible = signal(false);
  readonly authError = signal<string | null>(null);
  readonly isSubmitting = signal(false);

  readonly form = this.formBuilder.nonNullable.group({
    identifier: ['', [Validators.required, Validators.maxLength(120)]],
    password: ['', [Validators.required, Validators.maxLength(120)]],
    rememberMe: [true],
  });

  readonly session = this.authService.session;
  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly currentLanguage = this.languageService.currentLanguage;
  readonly loginMetrics = toSignal(
    this.loginMetricsService.get().pipe(catchError(() => of(EMPTY_LOGIN_METRICS))),
    { initialValue: EMPTY_LOGIN_METRICS },
  );
  readonly heroMetrics = computed(() => {
    const metrics = this.loginMetrics();

    return [
      { key: 'programs', label: 'auth.metricPrograms', value: metrics.programs },
      {
        key: 'beneficiaries',
        label: 'auth.metricBeneficiaries',
        value: metrics.beneficiaries,
      },
      { key: 'deliveries', label: 'auth.metricDeliveries', value: metrics.deliveries },
    ];
  });

  constructor() {
    merge(
      this.form.controls.identifier.valueChanges,
      this.form.controls.password.valueChanges,
    ).subscribe(() => this.authError.set(null));
  }

  continueToDashboard() {
    void this.router.navigateByUrl(
      this.authService.resolvePostLoginUrl(
        this.route.snapshot.queryParamMap.get('returnUrl'),
      ),
    );
  }

  logout() {
    void this.authService.logout();
  }

  setLanguage(language: string) {
    this.languageService.setLanguage(language);
  }

  async submit() {
    if (this.isSubmitting()) {
      return;
    }

    this.authError.set(null);

    if (this.form.invalid) {
      touchAll(this.form);
      this.toastService.show({
        type: 'error',
        translationKey: 'validation.reviewHighlightedFields',
      });
      return;
    }

    this.isSubmitting.set(true);
    const result = await this.authService.login(this.form.getRawValue());
    this.isSubmitting.set(false);

    if (!result.success) {
      const errorKey = result.message ?? 'auth.invalidCredentials';
      this.authError.set(errorKey);
      this.toastService.show({ type: 'error', translationKey: errorKey });
      return;
    }

    this.authError.set(null);
    void this.router.navigateByUrl(
      this.authService.resolvePostLoginUrl(
        this.route.snapshot.queryParamMap.get('returnUrl'),
      ),
    );
  }
}
