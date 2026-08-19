import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ButtonComponent } from '../../shared/components/button/button.component';
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
  selector: 'app-first-access-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslateModule,
    ButtonComponent,
    PasswordFieldComponent,
  ],
  templateUrl: './first-access.page.html',
  styleUrl: './first-access.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FirstAccessPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  readonly passwordVisible = signal(false);
  readonly confirmVisible = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly isSubmitting = signal(false);

  readonly form = this.formBuilder.nonNullable.group({
    currentPassword: ['', [Validators.required, Validators.maxLength(120)]],
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
  }, {
    validators: passwordMismatchValidator,
  });

  readonly session = this.authService.session;

  async logout() {
    await this.authService.logout();
    await this.router.navigate(['/login']);
  }

  async submit() {
    if (this.isSubmitting()) {
      return;
    }

    this.errorMessage.set(null);

    if (this.form.invalid) {
      touchAll(this.form);
      this.toastService.show({
        type: 'error',
        translationKey: 'validation.reviewHighlightedFields',
      });
      return;
    }

    const raw = this.form.getRawValue();

    this.isSubmitting.set(true);
    const result = await this.authService.changePassword({
      currentPassword: raw.currentPassword,
      newPassword: raw.newPassword,
    });
    this.isSubmitting.set(false);

    if (!result.success) {
      const errorKey = result.message ?? 'auth.invalidCurrentPassword';
      this.errorMessage.set(errorKey);
      this.toastService.show({ type: 'error', translationKey: errorKey });
      return;
    }

    this.errorMessage.set(null);
    void this.router.navigateByUrl(this.authService.resolvePostLoginUrl());
  }

  showPasswordMismatch() {
    return (
      this.form.hasError('passwordMismatch') &&
      (this.form.controls.confirmPassword.touched || this.form.controls.confirmPassword.dirty)
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

    if (!strength) {
      return null;
    }

    return `auth.passwordStrength.${strength}`;
  }
}
