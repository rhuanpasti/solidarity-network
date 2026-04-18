import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BenefitCategory, type BenefitSummary } from '@solidarity-network/shared';
import { BenefitsService } from '../../core/services/benefits.service';
import { ToastService } from '../../core/services/toast.service';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { CheckboxFieldComponent } from '../../shared/components/checkbox-field/checkbox-field.component';
import { EditorPanelComponent } from '../../shared/components/editor-panel/editor-panel.component';
import { FormSelectComponent, type SelectOption } from '../../shared/components/form-select/form-select.component';
import { InputFieldComponent } from '../../shared/components/input-field/input-field.component';
import { ListPanelComponent } from '../../shared/components/list-panel/list-panel.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { CrudFormController } from '../../shared/utils/crud-form.controller';
import {
  applyServerValidationErrors,
  clearServerValidationErrors,
  touchAll,
} from '../../shared/utils/form.utils';

@Component({
  selector: 'app-benefits-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslateModule,
    ButtonComponent,
    CheckboxFieldComponent,
    EditorPanelComponent,
    FormSelectComponent,
    InputFieldComponent,
    ListPanelComponent,
    PageHeaderComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './benefits.page.html',
  styleUrl: './benefits.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BenefitsPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly benefitsService = inject(BenefitsService);
  private readonly toastService = inject(ToastService);

  readonly items = signal<BenefitSummary[]>([]);
  readonly isSubmitting = signal(false);
  readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', [Validators.required, Validators.maxLength(1000)]],
    category: this.formBuilder.nonNullable.control<BenefitCategory>(BenefitCategory.Food, {
      validators: [Validators.required],
    }),
    active: [true, Validators.required],
  });
  readonly categoryOptions: SelectOption[] = [
    { value: BenefitCategory.Food, translationKey: 'enums.categories.food' },
    { value: BenefitCategory.Hygiene, translationKey: 'enums.categories.hygiene' },
    { value: BenefitCategory.Financial, translationKey: 'enums.categories.financial' },
    { value: BenefitCategory.Education, translationKey: 'enums.categories.education' },
    { value: BenefitCategory.Clothing, translationKey: 'enums.categories.clothing' },
    { value: BenefitCategory.Medicine, translationKey: 'enums.categories.medicine' },
    { value: BenefitCategory.Other, translationKey: 'enums.categories.other' },
  ];
  readonly editor = new CrudFormController<BenefitSummary>({
    form: this.form,
    onCreate: () => {
      this.form.reset({
        name: '',
        description: '',
        category: BenefitCategory.Food,
        active: true,
      });
    },
    onView: (item) => {
      this.form.reset({
        name: item.name,
        description: item.description,
        category: item.category,
        active: item.active,
      });
    },
  });
  readonly selected = this.editor.selected;
  readonly isReadOnly = this.editor.isReadOnly;

  ngOnInit() {
    this.load();
  }

  load() {
    this.benefitsService
      .list({ pageSize: 100 })
      .subscribe((response) => this.items.set(response.items));
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
        this.editor.startCreate();
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
}
