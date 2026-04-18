import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import {
  AdministratorRole,
  CharityProgramStatus,
  type PaginationMeta,
  type CharityProgramSummary,
} from '@solidarity-network/shared';
import { AuthService } from '../../core/auth/auth.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
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
import { CharityProgramsService } from '../../core/services/charity-programs.service';
import { ToastService } from '../../core/services/toast.service';

type CharityProgramFormMode = 'create' | 'view' | 'edit';

const DEFAULT_PAGE_SIZE = 10;
const EMPTY_PAGINATION_META: PaginationMeta = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  totalItems: 0,
  totalPages: 1,
};

@Component({
  selector: 'app-charity-programs-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslateModule,
    DatePipe,
    PageHeaderComponent,
    StatusBadgeComponent,
    EmptyStateComponent,
    ButtonComponent,
    FormErrorComponent,
    InputFieldComponent,
  ],
  templateUrl: './charity-programs.page.html',
  styleUrl: './charity-programs.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CharityProgramsPage implements OnInit {
  readonly CharityProgramStatus = CharityProgramStatus;
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly charityProgramsService = inject(CharityProgramsService);
  private readonly toastService = inject(ToastService);

  readonly items = signal<CharityProgramSummary[]>([]);
  readonly pagination = signal<PaginationMeta>(EMPTY_PAGINATION_META);
  readonly selected = signal<CharityProgramSummary | null>(null);
  readonly mode = signal<CharityProgramFormMode>('create');
  readonly showControlError = shouldShowControlError;
  readonly isSubmitting = signal(false);
  readonly isReadOnly = signal(false);
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

  select(program: CharityProgramSummary) {
    this.selected.set(program);
    this.mode.set('view');
    this.form.reset({
      name: program.name,
      description: program.description,
      status: program.status,
    });
    this.setFormReadOnly(true);
  }

  startCreate() {
    this.selected.set(null);
    this.mode.set('create');
    this.form.reset({
      name: '',
      description: '',
      status: CharityProgramStatus.Active,
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

    if (!this.selected() && !this.canCreatePrograms()) {
      return;
    }

    const payload = this.form.getRawValue();
    clearServerValidationErrors(this.form);
    const request = this.selected()
      ? this.charityProgramsService.update(this.selected()!.id, payload)
      : this.charityProgramsService.create(payload);

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

  toggleStatus(program: CharityProgramSummary) {
    const nextStatus =
      program.status === CharityProgramStatus.Active
        ? CharityProgramStatus.Inactive
        : CharityProgramStatus.Active;

    this.charityProgramsService.updateStatus(program.id, nextStatus).subscribe(() => this.load());
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
