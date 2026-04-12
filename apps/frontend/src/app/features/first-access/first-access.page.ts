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
import { FormErrorComponent } from '../../shared/components/form-error/form-error.component';
import { shouldShowControlError, touchAll } from '../../shared/utils/form.utils';

const PASSWORD_POLICY_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{12,}$/;

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
  imports: [ReactiveFormsModule, TranslateModule, ButtonComponent, FormErrorComponent],
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
  readonly showControlError = shouldShowControlError;

  readonly form = this.formBuilder.nonNullable.group({
    currentPassword: ['', [Validators.required, Validators.maxLength(120)]],
    newPassword: [
      '',
      [
        Validators.required,
        Validators.minLength(12),
        Validators.pattern(PASSWORD_POLICY_REGEX),
        Validators.maxLength(120),
      ],
    ],
    confirmPassword: ['', [Validators.required, Validators.maxLength(120)]],
  }, {
    validators: passwordMismatchValidator,
  });

  readonly session = this.authService.session;

  togglePasswordVisibility(field: 'new' | 'confirm') {
    if (field === 'new') {
      this.passwordVisible.update((current) => !current);
      return;
    }

    this.confirmVisible.update((current) => !current);
  }

  logout() {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }

  async submit() {
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

    const result = await this.authService.changePassword({
      currentPassword: raw.currentPassword,
      newPassword: raw.newPassword,
    });

    if (!result.success) {
      this.errorMessage.set(result.message ?? 'auth.invalidCurrentPassword');
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
}
