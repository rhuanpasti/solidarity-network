import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BenefitCategory, type BenefitSummary } from '@solidarity-network/shared';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { FormErrorComponent } from '../../shared/components/form-error/form-error.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { shouldShowControlError, touchAll } from '../../shared/utils/form.utils';
import { BenefitsService } from '../../core/services/benefits.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-benefits-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslateModule,
    ButtonComponent,
    EmptyStateComponent,
    FormErrorComponent,
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
  readonly showControlError = shouldShowControlError;

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
    this.benefitsService.list().subscribe((response) => this.items.set(response.items));
  }

  select(item: BenefitSummary) {
    this.selected.set(item);
    this.form.reset({
      name: item.name,
      description: item.description,
      category: item.category,
      active: item.active,
    });
  }

  resetForm() {
    this.selected.set(null);
    this.form.reset({
      name: '',
      description: '',
      category: BenefitCategory.Food,
      active: true,
    });
  }

  submit() {
    if (this.form.invalid) {
      touchAll(this.form);
      this.toastService.show({
        type: 'error',
        translationKey: 'validation.reviewHighlightedFields',
      });
      return;
    }

    const payload = this.form.getRawValue();
    const request = this.selected()
      ? this.benefitsService.update(this.selected()!.id, payload)
      : this.benefitsService.create(payload);

    request.subscribe(() => {
      this.toastService.show({ type: 'success', text: 'Saved successfully.' });
      this.resetForm();
      this.load();
    });
  }

  toggleStatus(item: BenefitSummary) {
    this.benefitsService.updateStatus(item.id, !item.active).subscribe(() => this.load());
  }
}
