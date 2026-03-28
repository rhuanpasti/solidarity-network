import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/auth.service';
import { LanguageService } from '../../core/i18n/language.service';
import { touchAll } from '../../shared/utils/form.utils';

@Component({
  selector: 'sn-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, TranslateModule],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly languageService = inject(LanguageService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly passwordVisible = signal(false);
  readonly authError = signal<string | null>(null);

  readonly form = this.formBuilder.nonNullable.group({
    identifier: ['', [Validators.required, Validators.maxLength(120)]],
    password: ['', [Validators.required]],
    rememberMe: [true],
  });

  readonly session = this.authService.session;
  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly currentLanguage = this.languageService.currentLanguage;

  togglePasswordVisibility() {
    this.passwordVisible.update((current) => !current);
  }

  continueToDashboard() {
    void this.router.navigateByUrl(
      this.authService.resolvePostLoginUrl(
        this.route.snapshot.queryParamMap.get('returnUrl'),
      ),
    );
  }

  logout() {
    this.authService.logout();
  }

  setLanguage(language: string) {
    this.languageService.setLanguage(language);
  }

  async submit() {
    if (this.form.invalid) {
      touchAll(this.form);
      return;
    }

    const result = await this.authService.login(this.form.getRawValue());

    if (!result.success) {
      this.authError.set(result.message ?? 'auth.invalidCredentials');
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
