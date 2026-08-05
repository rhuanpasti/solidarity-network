import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { map } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { LanguageService } from '../../core/i18n/language.service';
import { ToastService } from '../../core/services/toast.service';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { LanguageSwitcherComponent } from '../../shared/components/language-switcher/language-switcher.component';
import { PasswordFieldComponent } from '../../shared/components/password-field/password-field.component';
import { touchAll } from '../../shared/utils/form.utils';

const PASSWORD_POLICY_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

type PasswordRequirement = {
  key: string;
  met: boolean;
};

function passwordMismatchValidator(control: AbstractControl): ValidationErrors | null {
  const newPassword = control.get('newPassword')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  if (!newPassword || !confirmPassword || newPassword === confirmPassword) {
    return null;
  }

  return { passwordMismatch: true };
}

@Component({
  selector: 'app-reset-password-page',
  imports: [
    ReactiveFormsModule,
    TranslateModule,
    ButtonComponent,
    LanguageSwitcherComponent,
    PasswordFieldComponent,
  ],
  templateUrl: './reset-password.page.html',
  styleUrl: './reset-password.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly languageService = inject(LanguageService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly token = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('token'))),
    { initialValue: null },
  );
  readonly currentLanguage = this.languageService.currentLanguage;
  readonly passwordVisible = signal(false);
  readonly confirmVisible = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly isSubmitting = signal(false);
  readonly isComplete = signal(false);

  readonly form = this.formBuilder.nonNullable.group(
    {
      newPassword: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(PASSWORD_POLICY_REGEX),
          Validators.maxLength(120),
        ],
      ],
      confirmPassword: ['', [Validators.required, Validators.maxLength(120)]],
    },
    { validators: passwordMismatchValidator },
  );

  setLanguage(language: string) {
    this.languageService.setLanguage(language);
  }

  backToLogin() {
    void this.router.navigate(['/login']);
  }

  async submit() {
    if (this.isSubmitting()) {
      return;
    }

    this.errorMessage.set(null);

    const resetToken = this.token();

    if (!resetToken) {
      this.errorMessage.set('auth.resetPasswordTokenMissing');
      return;
    }

    if (this.form.invalid) {
      touchAll(this.form);
      this.toastService.show({
        type: 'error',
        translationKey: 'validation.reviewHighlightedFields',
      });
      return;
    }

    this.isSubmitting.set(true);
    const result = await this.authService.resetPassword({
      token: resetToken,
      newPassword: this.form.controls.newPassword.value,
    });
    this.isSubmitting.set(false);

    if (!result.success) {
      const errorKey = result.message ?? 'auth.resetPasswordTokenInvalid';
      this.errorMessage.set(errorKey);
      this.toastService.show({ type: 'error', translationKey: errorKey });
      return;
    }

    this.isComplete.set(true);
    this.toastService.show({
      type: 'success',
      translationKey: 'auth.resetPasswordSuccess',
    });
  }

  showPasswordMismatch() {
    return (
      this.form.hasError('passwordMismatch') &&
      (this.form.controls.confirmPassword.touched ||
        this.form.controls.confirmPassword.dirty)
    );
  }

  shouldShowPasswordFeedback() {
    const control = this.form.controls.newPassword;
    return control.touched || control.dirty || control.value.length > 0;
  }

  passwordRequirements(): PasswordRequirement[] {
    const password = this.form.controls.newPassword.value;

    return [
      {
        key: 'auth.passwordRequirementMinLength',
        met: password.length >= 8,
      },
      {
        key: 'auth.passwordRequirementUppercase',
        met: /[A-Z]/.test(password),
      },
      {
        key: 'auth.passwordRequirementLowercase',
        met: /[a-z]/.test(password),
      },
      {
        key: 'auth.passwordRequirementNumber',
        met: /\d/.test(password),
      },
      {
        key: 'auth.passwordRequirementSpecial',
        met: /[^A-Za-z\d]/.test(password),
      },
    ];
  }

  passwordStrength() {
    const password = this.form.controls.newPassword.value;
    const score = this.passwordRequirements().filter((requirement) => requirement.met).length;

    if (!password) {
      return null;
    }

    if (score <= 2) {
      return 'weak';
    }

    if (score <= 4) {
      return 'medium';
    }

    return 'strong';
  }

  passwordStrengthLabel() {
    const strength = this.passwordStrength();

    return strength ? `auth.passwordStrength.${strength}` : null;
  }
}
