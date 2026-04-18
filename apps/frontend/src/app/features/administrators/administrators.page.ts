import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import {
  AdministratorRole,
  type AdministratorSummary,
  type CharityProgramSummary,
} from '@solidarity-network/shared';
import { AuthService } from '../../core/auth/auth.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { FormErrorComponent } from '../../shared/components/form-error/form-error.component';
import { InputFieldComponent } from '../../shared/components/input-field/input-field.component';
import {
  applyServerValidationErrors,
  clearServerValidationErrors,
  shouldShowControlError,
  touchAll,
} from '../../shared/utils/form.utils';
import { genericPhoneValidator } from '../../shared/utils/validation.utils';
import { AdministratorsService } from '../../core/services/administrators.service';
import { CharityProgramsService } from '../../core/services/charity-programs.service';
import { ToastService } from '../../core/services/toast.service';

interface GeneratedAdministratorCredential {
  name: string;
  email: string;
  passkey: string;
}

@Component({
  selector: 'app-administrators-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslateModule,
    PageHeaderComponent,
    EmptyStateComponent,
    ButtonComponent,
    FormErrorComponent,
    InputFieldComponent,
  ],
  templateUrl: './administrators.page.html',
  styleUrl: './administrators.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdministratorsPage implements OnInit {
  readonly AdministratorRole = AdministratorRole;
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly administratorsService = inject(AdministratorsService);
  private readonly charityProgramsService = inject(CharityProgramsService);
  private readonly toastService = inject(ToastService);

  readonly items = signal<AdministratorSummary[]>([]);
  readonly programs = signal<CharityProgramSummary[]>([]);
  readonly selected = signal<AdministratorSummary | null>(null);
  readonly generatedCredential = signal<GeneratedAdministratorCredential | null>(null);
  readonly showControlError = shouldShowControlError;
  readonly isSubmitting = signal(false);
  readonly canCreateAdministrators = computed(() => {
    const session = this.authService.session();

    return (
      session?.accountType === 'administrator' &&
      session.role === AdministratorRole.SuperAdmin
    );
  });

  readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.maxLength(30), genericPhoneValidator()]],
    role: this.formBuilder.nonNullable.control<AdministratorRole>(
      AdministratorRole.ProgramManager,
      {
        validators: [Validators.required],
      },
    ),
    charityProgramIds: this.formBuilder.nonNullable.control<string[]>([]),
  });

  ngOnInit() {
    this.load();
    this.charityProgramsService
      .list({ pageSize: 100 })
      .subscribe((response) => this.programs.set(response.items));
  }

  load() {
    this.administratorsService
      .list({ pageSize: 100 })
      .subscribe((response) => this.items.set(response.items));
  }

  select(item: AdministratorSummary) {
    this.selected.set(item);
    this.generatedCredential.set(null);
    this.form.reset({
      name: item.name,
      email: item.email,
      phone: item.phone,
      role: item.role,
      charityProgramIds: item.charityPrograms.map((program) => program.id),
    });
  }

  resetForm() {
    this.selected.set(null);
    this.generatedCredential.set(null);
    this.form.reset({
      name: '',
      email: '',
      phone: '',
      role: AdministratorRole.ProgramManager,
      charityProgramIds: [],
    });
  }

  updatePrograms(event: Event) {
    const options = Array.from((event.target as HTMLSelectElement).selectedOptions).map(
      (option) => option.value,
    );
    this.form.controls.charityProgramIds.setValue(options);
  }

  submit() {
    if (this.isSubmitting()) {
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

    const payload = this.form.getRawValue();
    clearServerValidationErrors(this.form);

    if (this.selected()) {
      this.isSubmitting.set(true);
      this.administratorsService.update(this.selected()!.id, payload).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.toastService.show({ type: 'success', text: 'Saved successfully.' });
          this.resetForm();
          this.load();
        },
        error: (error) => {
          this.isSubmitting.set(false);
          applyServerValidationErrors(this.form, error);
        },
      });
      return;
    }

    if (!this.canCreateAdministrators()) {
      return;
    }

    this.isSubmitting.set(true);
    this.administratorsService.create(payload).subscribe({
      next: (response) => {
        this.isSubmitting.set(false);
        this.toastService.show({ type: 'success', text: 'Saved successfully.' });
        this.generatedCredential.set({
          name: response.administrator.name,
          email: response.administrator.email,
          passkey: response.generatedPasskey,
        });
        this.resetFormForNextCreate();
        this.load();
      },
      error: (error) => {
        this.isSubmitting.set(false);
        applyServerValidationErrors(this.form, error);
      },
    });
  }

  private resetFormForNextCreate() {
    this.selected.set(null);
    this.form.reset({
      name: '',
      email: '',
      phone: '',
      role: AdministratorRole.ProgramManager,
      charityProgramIds: [],
    });
  }
}
