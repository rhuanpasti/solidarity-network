import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/auth.service';
import { touchAll } from '../../shared/utils/form.utils';

@Component({
  selector: 'sn-first-access-page',
  standalone: true,
  imports: [ReactiveFormsModule, TranslateModule],
  templateUrl: './first-access.page.html',
  styleUrl: './first-access.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FirstAccessPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly passwordVisible = signal(false);
  readonly confirmVisible = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.formBuilder.nonNullable.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
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
    if (this.form.invalid) {
      touchAll(this.form);
      return;
    }

    const raw = this.form.getRawValue();

    if (raw.newPassword !== raw.confirmPassword) {
      this.errorMessage.set('auth.passwordMismatch');
      return;
    }

    const result = await this.authService.changePassword({
      currentPassword: raw.currentPassword,
      newPassword: raw.newPassword,
    });

    if (!result.success) {
      this.errorMessage.set(result.message ?? 'auth.invalidCurrentPassword');
      return;
    }

    this.errorMessage.set(null);
    void this.router.navigate(['/dashboard']);
  }
}
