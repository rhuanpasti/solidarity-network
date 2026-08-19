import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { TemplateRef } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { BenefitCategory, type ListQuery, type BenefitSummary } from '@solidarity-network/shared';
import { BenefitsService } from '../../core/services/benefits.service';
import { ToastService } from '../../core/services/toast.service';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { CheckboxFieldComponent } from '../../shared/components/checkbox-field/checkbox-field.component';
import { FormSelectComponent, type SelectOption } from '../../shared/components/form-select/form-select.component';
import { InputFieldComponent } from '../../shared/components/input-field/input-field.component';
import { ListPanelComponent } from '../../shared/components/list-panel/list-panel.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { ModalService } from '../../shared/components/modal/modal.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { CrudFormController } from '../../shared/utils/crud-form.controller';
import { DEFAULT_PAGE_SIZE } from '../../shared/utils/pagination.utils';
import {
  applyServerValidationErrors,
  prepareFormForSubmit,
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
    FormSelectComponent,
    InputFieldComponent,
    ListPanelComponent,
    ModalComponent,
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
  private readonly modalService = inject(ModalService);
  private editorDialogRef: DialogRef<unknown> | null = null;

  readonly requestQuery = signal<ListQuery>({ page: 1, pageSize: 100 });
  readonly listState = computed(() => this.benefitsService.listState(this.requestQuery()));
  readonly items = computed(() => this.listState().data?.items ?? []);
  readonly refreshing = computed(() => this.listState().refreshing);
  readonly refreshCooldownSeconds = computed(() =>
    this.listState().nextRefreshAt === null
      ? 0
      : Math.max(1, Math.ceil((this.listState().nextRefreshAt! - Date.now()) / 1000)),
  );
  readonly refreshDisabled = computed(
    () => this.refreshing() || this.refreshCooldownSeconds() > 0,
  );
  readonly isSubmitting = signal(false);
  readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', [Validators.required, Validators.maxLength(1000)]],
    category: this.formBuilder.nonNullable.control<BenefitCategory>(BenefitCategory.Food, {
      validators: [Validators.required],
    }),
    active: [true],
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
  readonly editorTitle = computed(() =>
    this.selected() ? 'features.benefits.editTitle' : 'features.benefits.createTitle',
  );

  ngOnInit() {
    this.load();
  }

  load(force = false) {
    const query = { page: 1, pageSize: DEFAULT_PAGE_SIZE * 10 };
    this.requestQuery.set(query);

    if (force) {
      this.benefitsService.invalidateList(query);
    }

    this.benefitsService.ensureList(query);
  }

  refresh() {
    this.benefitsService.refreshList(this.requestQuery());
  }

  openCreate(template: TemplateRef<unknown>) {
    this.editor.startCreate();
    this.openEditorDialog(template);
  }

  openItem(item: BenefitSummary, template: TemplateRef<unknown>) {
    this.editor.select(item);
    this.openEditorDialog(template);
  }

  cancelEditor() {
    this.editor.cancel();
    this.closeEditorDialog();
  }

  closeEditorDialog() {
    this.editorDialogRef?.close();
    this.editorDialogRef = null;
  }

  private openEditorDialog(template: TemplateRef<unknown>) {
    this.editorDialogRef?.close();
    this.editorDialogRef = this.modalService.open(template);
    this.editorDialogRef.closed.subscribe(() => {
      this.editorDialogRef = null;
    });
  }

  submit() {
    if (this.isSubmitting() || this.isReadOnly()) {
      return;
    }

    prepareFormForSubmit(this.form);

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

    this.isSubmitting.set(true);
    request.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toastService.show({ type: 'success', text: 'Saved successfully.' });
        this.editor.startCreate();
        this.closeEditorDialog();
        this.load(true);
      },
      error: (error) => {
        this.isSubmitting.set(false);
        applyServerValidationErrors(this.form, error);
      },
    });
  }

  toggleStatus(item: BenefitSummary) {
    this.benefitsService
      .updateStatus(item.id, !item.active)
      .subscribe(() => this.load(true));
  }
}
