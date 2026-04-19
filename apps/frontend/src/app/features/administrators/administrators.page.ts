import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { TranslateModule } from "@ngx-translate/core";
import {
  AdministratorRole,
  type PaginationMeta,
  type AdministratorSummary,
  type CharityProgramSummary,
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
import { EditorPanelComponent } from "../../shared/components/editor-panel/editor-panel.component";
import { GeneratedCredentialCardComponent } from "../../shared/components/generated-credential-card/generated-credential-card.component";
import {
  FormSelectComponent,
  type SelectOption,
} from "../../shared/components/form-select/form-select.component";
import { CrudFormController } from "../../shared/utils/crud-form.controller";

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
    EditorPanelComponent,
    ButtonComponent,
    InputFieldComponent,
    GeneratedCredentialCardComponent,
    FormSelectComponent,
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

  readonly items = signal<AdministratorSummary[]>([]);
  readonly programs = signal<CharityProgramSummary[]>([]);
  readonly pagination = signal<PaginationMeta>(DEFAULT_PAGINATION_META);
  readonly generatedCredential =
    signal<GeneratedAdministratorCredential | null>(null);
  readonly isSubmitting = signal(false);
  readonly pageSizes = [10, 25, 50];
  readonly listLoading = signal(false);
  readonly canCreateAdministrators = computed(() => {
    const session = this.authService.session();

    return (
      session?.accountType === "administrator" &&
      session.role === AdministratorRole.SuperAdmin
    );
  });

  readonly filterForm = this.formBuilder.nonNullable.group({
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

  ngOnInit() {
    this.load();
    this.charityProgramsService
      .list({ pageSize: 100 })
      .subscribe((response) => this.programs.set(response.items));
  }

  load() {
    this.listLoading.set(true);
    this.administratorsService
      .list({
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
              text: "Saved successfully.",
            });
            this.editor.startCreate();
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
        this.toastService.show({
          type: "success",
          text: "Saved successfully.",
        });
        this.generatedCredential.set({
          name: response.administrator.name,
          email: response.administrator.email,
          passkey: response.generatedPasskey,
        });
        this.editor.startCreate();
        this.load();
      },
      error: (error) => {
        this.isSubmitting.set(false);
        applyServerValidationErrors(this.form, error);
      },
    });
  }
}
