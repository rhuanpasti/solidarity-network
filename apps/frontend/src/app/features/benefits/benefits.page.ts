import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BenefitCategory, type BenefitSummary } from '@solidarity-network/shared';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { FormErrorComponent } from '../../shared/components/form-error/form-error.component';
import { InputFieldComponent } from '../../shared/components/input-field/input-field.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { shouldShowControlError, touchAll } from '../../shared/utils/form.utils';
import { BenefitsService } from '../../core/services/benefits.service';
import { ToastService } from '../../core/services/toast.service';
import { applyServerValidationErrors, clearServerValidationErrors } from '../../shared/utils/form.utils';

type BenefitFormMode = 'create' | 'view' | 'edit';

@Component({
  selector: 'app-benefits-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslateModule,
    ButtonComponent,
    EmptyStateComponent,
    FormErrorComponent,
    InputFieldComponent,
    PageHeaderComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './benefits.page.html',
  styleUrl: './benefits.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BenefitsPage implements OnInit {
  readonly BenefitCategory = BenefitCategory;
  private readonly formBuilder = inject(FormBuilder);
  private readonly benefitsService = inject(BenefitsService);
  private readonly toastService = inject(ToastService);

  readonly items = signal<BenefitSummary[]>([]);
  readonly selected = signal<BenefitSummary | null>(null);
  readonly mode = signal<BenefitFormMode>('create');
  readonly showControlError = shouldShowControlError;
  readonly isSubmitting = signal(false);
  readonly isReadOnly = signal(false);

  readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', [Validators.required, Validators.maxLength(1000)]],
    category: this.formBuilder.nonNullable.control<BenefitCategory>(BenefitCategory.Food, {
      validators: [Validators.required],
    }),
    active: [true, Validators.required],
  });

  ngOnInit() {
    this.load();
  }

  load() {
    this.benefitsService.list({ pageSize: 100 }).subscribe((response) => this.items.set(response.items));
  }

  select(item: BenefitSummary) {
    this.selected.set(item);
    this.mode.set('view');
    this.form.reset({
      name: item.name,
      description: item.description,
      category: item.category,
      active: item.active,
    });
    this.setFormReadOnly(true);
  }

  startCreate() {
    this.selected.set(null);
    this.mode.set('create');
    this.form.reset({
      name: '',
      description: '',
      category: BenefitCategory.Food,
      active: true,
    });
    this.setFormReadOnly(false);
  }

  startEditing() {
    if (!this.selected()) {
      return;
    }

    this.mode.set('edit');
    this.setFormReadOnly(false);
  }

  cancel() {
    const selected = this.selected();

    if (selected) {
      this.select(selected);
      return;
    }

    this.startCreate();
  }

  submit() {
    if (this.isSubmitting() || this.isReadOnly()) {
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
    const request = this.selected()
      ? this.benefitsService.update(this.selected()!.id, payload)
      : this.benefitsService.create(payload);

    this.isSubmitting.set(true);
    request.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toastService.show({ type: 'success', text: 'Saved successfully.' });
        this.startCreate();
        this.load();
      },
      error: (error) => {
        this.isSubmitting.set(false);
        applyServerValidationErrors(this.form, error);
      },
    });
  }

  toggleStatus(item: BenefitSummary) {
    this.benefitsService.updateStatus(item.id, !item.active).subscribe(() => this.load());
  }

  private setFormReadOnly(readOnly: boolean) {
    this.isReadOnly.set(readOnly);

    if (readOnly) {
      this.form.disable({ emitEvent: false });
      return;
    }

    this.form.enable({ emitEvent: false });
  }
}
