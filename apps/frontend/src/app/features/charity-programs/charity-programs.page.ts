import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { TemplateRef } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import {
  AdministratorRole,
  CharityProgramStatus,
  type PaginationMeta,
  type CharityProgramSummary,
} from '@solidarity-network/shared';
import { AuthService } from '../../core/auth/auth.service';
import { CharityProgramsService } from '../../core/services/charity-programs.service';
import { ToastService } from '../../core/services/toast.service';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { FormSelectComponent, type SelectOption } from '../../shared/components/form-select/form-select.component';
import { InputFieldComponent } from '../../shared/components/input-field/input-field.component';
import { ListPanelComponent } from '../../shared/components/list-panel/list-panel.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { ModalService } from '../../shared/components/modal/modal.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { CrudFormController } from '../../shared/utils/crud-form.controller';
import {
  DEFAULT_PAGE_SIZE,
  DEFAULT_PAGINATION_META,
} from '../../shared/utils/pagination.utils';
import {
  applyServerValidationErrors,
  prepareFormForSubmit,
  touchAll,
} from '../../shared/utils/form.utils';

@Component({
  selector: 'app-charity-programs-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslateModule,
    DatePipe,
    PageHeaderComponent,
    StatusBadgeComponent,
    ButtonComponent,
    FormSelectComponent,
    InputFieldComponent,
    ListPanelComponent,
    ModalComponent,
  ],
  templateUrl: './charity-programs.page.html',
  styleUrl: './charity-programs.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CharityProgramsPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly charityProgramsService = inject(CharityProgramsService);
  private readonly toastService = inject(ToastService);
  private readonly modalService = inject(ModalService);
  private editorDialogRef: DialogRef<unknown> | null = null;

  readonly items = signal<CharityProgramSummary[]>([]);
  readonly pagination = signal<PaginationMeta>(DEFAULT_PAGINATION_META);
  readonly isSubmitting = signal(false);
  readonly pageSizes = [10, 25, 50];
  readonly listLoading = signal(false);
  readonly canCreatePrograms = computed(() => {
    const session = this.authService.session();

    return (
      session?.accountType === 'administrator' &&
      session.role === AdministratorRole.SuperAdmin
    );
  });
  readonly filterForm = this.formBuilder.nonNullable.group({
    search: [''],
    pageSize: [DEFAULT_PAGE_SIZE],
  });
  readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', [Validators.required, Validators.maxLength(1000)]],
    status: this.formBuilder.nonNullable.control<CharityProgramStatus>(
      CharityProgramStatus.Active,
      {
        validators: [Validators.required],
      },
    ),
  });
  readonly statusOptions: SelectOption[] = [
    { value: CharityProgramStatus.Active, translationKey: 'common.active' },
    { value: CharityProgramStatus.Inactive, translationKey: 'common.inactive' },
  ];
  readonly editor = new CrudFormController<CharityProgramSummary>({
    form: this.form,
    onCreate: () => {
      this.form.reset({
        name: '',
        description: '',
        status: CharityProgramStatus.Active,
      });
    },
    onView: (program) => {
      this.form.reset({
        name: program.name,
        description: program.description,
        status: program.status,
      });
    },
  });
  readonly selected = this.editor.selected;
  readonly isReadOnly = this.editor.isReadOnly;

  ngOnInit() {
    this.load();
  }

  load() {
    this.listLoading.set(true);
    this.charityProgramsService
      .list({
        search: this.filterForm.controls.search.value,
        page: this.pagination().page,
        pageSize: this.filterForm.controls.pageSize.value,
      })
      .subscribe({
        next: (response) => {
          this.listLoading.set(false);
          this.items.set(response.items);
          this.pagination.set(response.meta);
        },
        error: () => {
          this.listLoading.set(false);
        },
      });
  }

  searchPrograms() {
    this.pagination.update((current) => ({ ...current, page: 1 }));
    this.load();
  }

  openCreate(template: TemplateRef<unknown>) {
    this.editor.startCreate();
    this.openEditorDialog(template);
  }

  openItem(item: CharityProgramSummary, template: TemplateRef<unknown>) {
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

  changePage(page: number) {
    const pagination = this.pagination();

    if (page < 1 || page > pagination.totalPages || page === pagination.page) {
      return;
    }

    this.pagination.update((current) => ({ ...current, page }));
    this.load();
  }

  changePageSize(pageSize: string) {
    this.pagination.update((current) => ({
      ...current,
      page: 1,
      pageSize: Number(pageSize) || DEFAULT_PAGE_SIZE,
    }));
    this.load();
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

    if (!this.selected() && !this.canCreatePrograms()) {
      return;
    }

    const payload = this.form.getRawValue();
    const request = this.selected()
      ? this.charityProgramsService.update(this.selected()!.id, payload)
      : this.charityProgramsService.create(payload);

    this.isSubmitting.set(true);
    request.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toastService.show({ type: 'success', text: 'Saved successfully.' });
        this.editor.startCreate();
        this.closeEditorDialog();
        this.load();
      },
      error: (error) => {
        this.isSubmitting.set(false);
        applyServerValidationErrors(this.form, error);
      },
    });
  }

  toggleStatus(program: CharityProgramSummary) {
    const nextStatus =
      program.status === CharityProgramStatus.Active
        ? CharityProgramStatus.Inactive
        : CharityProgramStatus.Active;

    this.charityProgramsService.updateStatus(program.id, nextStatus).subscribe(() => this.load());
  }
}
