import { DialogRef } from "@angular/cdk/dialog";
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from "@angular/core";
import type { TemplateRef } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { TranslateModule } from "@ngx-translate/core";
import {
  AdministratorRole,
  CharityProgramStatus,
  type ListQuery,
  type AdministratorSummary,
} from "@solidarity-network/shared";
import { AuthService } from "../../core/auth/auth.service";
import { ButtonComponent } from "../../shared/components/button/button.component";
import { InputFieldComponent } from "../../shared/components/input-field/input-field.component";
import {
  applyServerValidationErrors,
  prepareFormForSubmit,
  touchAll,
} from "../../shared/utils/form.utils";
import {
  DEFAULT_PAGE_SIZE,
  DEFAULT_PAGINATION_META,
} from "../../shared/utils/pagination.utils";
import { genericPhoneValidator } from "../../shared/utils/validation.utils";
import { AdministratorsService } from "../../core/services/administrators.service";
import { CharityProgramsService } from "../../core/services/charity-programs.service";
import { ToastService } from "../../core/services/toast.service";
import { PageHeaderComponent } from "../../shared/components/page-header/page-header.component";
import { ListPanelComponent } from "../../shared/components/list-panel/list-panel.component";
import { GeneratedCredentialCardComponent } from "../../shared/components/generated-credential-card/generated-credential-card.component";
import {
  FormSelectComponent,
  type SelectOption,
} from "../../shared/components/form-select/form-select.component";
import { CrudFormController } from "../../shared/utils/crud-form.controller";
import { ModalComponent } from "../../shared/components/modal/modal.component";
import { ModalService } from "../../shared/components/modal/modal.service";

interface GeneratedAdministratorCredential {
  name: string;
  email: string;
  passkey: string;
}

@Component({
  selector: "app-administrators-page",
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslateModule,
    PageHeaderComponent,
    ListPanelComponent,
    ButtonComponent,
    InputFieldComponent,
    GeneratedCredentialCardComponent,
    FormSelectComponent,
    ModalComponent,
  ],
  templateUrl: "./administrators.page.html",
  styleUrl: "./administrators.page.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdministratorsPage implements OnInit {
  readonly AdministratorRole = AdministratorRole;
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly administratorsService = inject(AdministratorsService);
  private readonly charityProgramsService = inject(CharityProgramsService);
  private readonly toastService = inject(ToastService);
  private readonly modalService = inject(ModalService);
  private editorDialogRef: DialogRef<unknown> | null = null;

  readonly requestQuery = signal<ListQuery>({
    page: DEFAULT_PAGINATION_META.page,
    pageSize: DEFAULT_PAGE_SIZE,
    search: '',
  });
  readonly listState = computed(() =>
    this.administratorsService.listState(this.requestQuery()),
  );
  readonly items = computed(() => this.listState().data?.items ?? []);
  readonly pagination = computed(
    () => this.listState().data?.meta ?? DEFAULT_PAGINATION_META,
  );
  readonly programsState = computed(() =>
    this.charityProgramsService.listState({
      pageSize: 100,
      status: CharityProgramStatus.Active,
    }),
  );
  readonly programs = computed(() => this.programsState().data?.items ?? []);
  readonly generatedCredential =
    signal<GeneratedAdministratorCredential | null>(null);
  readonly isSubmitting = signal(false);
  readonly isResendingAccess = signal(false);
  readonly pageSizes = [10, 25, 50];
  readonly listLoading = computed(
    () => this.listState().loading && !this.listState().data,
  );
  readonly refreshing = computed(() => this.listState().refreshing);
  readonly refreshCooldownSeconds = computed(() =>
    this.listState().nextRefreshAt === null
      ? 0
      : Math.max(1, Math.ceil((this.listState().nextRefreshAt! - Date.now()) / 1000)),
  );
  readonly refreshDisabled = computed(
    () => this.refreshing() || this.refreshCooldownSeconds() > 0,
  );
  readonly canCreateAdministrators = computed(() => {
    const session = this.authService.session();

    return (
      session?.accountType === "administrator" &&
      session.role === AdministratorRole.SuperAdmin
    );
  });

  readonly filterForm = this.formBuilder.nonNullable.group({
    search: [''],
    pageSize: [DEFAULT_PAGE_SIZE],
  });

  readonly form = this.formBuilder.nonNullable.group({
    name: ["", [Validators.required, Validators.maxLength(120)]],
    email: ["", [Validators.required, Validators.email]],
    phone: [
      "",
      [Validators.required, Validators.maxLength(30), genericPhoneValidator()],
    ],
    role: this.formBuilder.nonNullable.control<AdministratorRole>(
      AdministratorRole.ProgramManager,
      {
        validators: [Validators.required],
      },
    ),
    charityProgramIds: this.formBuilder.nonNullable.control<string[]>([]),
  });

  readonly roleOptions: SelectOption[] = [
    {
      value: AdministratorRole.SuperAdmin,
      translationKey: "enums.roles.super_admin",
    },
    {
      value: AdministratorRole.ProgramManager,
      translationKey: "enums.roles.program_manager",
    },
    {
      value: AdministratorRole.CaseWorker,
      translationKey: "enums.roles.case_worker",
    },
  ];

  readonly programOptions = computed<SelectOption[]>(() =>
    this.programs().map((program) => ({
      value: program.id,
      label: program.name,
    })),
  );

  readonly editor = new CrudFormController<AdministratorSummary>({
    form: this.form,
    onCreate: () => {
      this.generatedCredential.set(null);
      this.form.reset({
        name: "",
        email: "",
        phone: "",
        role: AdministratorRole.ProgramManager,
        charityProgramIds: [],
      });
    },
    onView: (item) => {
      this.generatedCredential.set(null);
      this.form.reset({
        name: item.name,
        email: item.email,
        phone: item.phone,
        role: item.role,
        charityProgramIds: item.charityPrograms.map((program) => program.id),
      });
    },
  });

  readonly selected = this.editor.selected;
  readonly mode = this.editor.mode;
  readonly isReadOnly = this.editor.isReadOnly;
  readonly editorTitle = computed(() =>
    this.selected()
      ? 'features.administrators.editTitle'
      : 'features.administrators.createTitle',
  );

  ngOnInit() {
    this.load();
    this.charityProgramsService.ensureList({
      pageSize: 100,
      status: CharityProgramStatus.Active,
    });
  }

  openCreate(template: TemplateRef<unknown>) {
    this.editor.startCreate();
    this.openEditorDialog(template);
  }

  openItem(item: AdministratorSummary, template: TemplateRef<unknown>) {
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

  resendTemporaryAccess() {
    const administrator = this.selected();

    if (!administrator || this.isResendingAccess() || this.isSubmitting()) {
      return;
    }

    this.isResendingAccess.set(true);
    this.administratorsService.resendTemporaryAccess(administrator.id).subscribe({
      next: (response) => {
        this.isResendingAccess.set(false);
        this.toastService.show({
          type: response.success ? "success" : "error",
          translationKey: response.success
            ? "features.administrators.accessEmailResent"
            : "features.administrators.accessEmailResendFailed",
        });
      },
      error: () => {
        this.isResendingAccess.set(false);
      },
    });
  }

  private openEditorDialog(template: TemplateRef<unknown>) {
    this.editorDialogRef?.close();
    this.editorDialogRef = this.modalService.open(template);
    this.editorDialogRef.closed.subscribe(() => {
      this.editorDialogRef = null;
    });
  }

  load(force = false) {
    const query: ListQuery = {
      page: this.requestQuery().page,
      pageSize: this.filterForm.controls.pageSize.value,
      search: this.filterForm.controls.search.value,
    };
    this.requestQuery.set(query);

    if (force) {
      this.administratorsService.invalidateList(query);
    }

    this.administratorsService.ensureList(query);
  }

  refresh() {
    this.administratorsService.refreshList(this.requestQuery());
    this.charityProgramsService.refreshList({
      pageSize: 100,
      status: CharityProgramStatus.Active,
    });
  }

  searchAdministrators() {
    this.requestQuery.update((current) => ({ ...current, page: 1 }));
    this.load();
  }

  changePage(page: number) {
    const pagination = this.pagination();

    if (page < 1 || page > pagination.totalPages || page === pagination.page) {
      return;
    }

    this.requestQuery.update((current) => ({ ...current, page }));
    this.load();
  }

  changePageSize(pageSize: number) {
    this.filterForm.controls.pageSize.setValue(pageSize);
    this.requestQuery.update((current) => ({
      ...current,
      page: 1,
      pageSize: pageSize || DEFAULT_PAGE_SIZE,
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
        type: "error",
        translationKey: "validation.reviewHighlightedFields",
      });
      return;
    }

    const payload = this.form.getRawValue();

    if (this.selected()) {
      this.isSubmitting.set(true);
      this.administratorsService
        .update(this.selected()!.id, payload)
        .subscribe({
          next: () => {
            this.isSubmitting.set(false);
            this.toastService.show({
              type: "success",
              translationKey: 'common.savedSuccessfully',
            });
            this.editor.startCreate();
            this.load(true);
            this.closeEditorDialog();
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
        this.toastService.show({
          type: "success",
          translationKey: 'common.savedSuccessfully',
        });
        this.generatedCredential.set({
          name: response.administrator.name,
          email: response.administrator.email,
          passkey: response.generatedPasskey,
        });
        this.editor.startCreate();
        this.load(true);
        this.closeEditorDialog();
      },
      error: (error) => {
        this.isSubmitting.set(false);
        applyServerValidationErrors(this.form, error);
      },
    });
  }
}
