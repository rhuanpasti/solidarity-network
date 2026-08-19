import { DatePipe } from '@angular/common';
import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import type { TemplateRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import {
  BenefitDeliverySummary,
  BeneficiarySummary,
  CharityProgramStatus,
} from '@solidarity-network/shared';
import {
  Observable,
  distinctUntilChanged,
  finalize,
  map,
  shareReplay,
  startWith,
} from 'rxjs';
import { BeneficiariesService } from '../../core/services/beneficiaries.service';
import { BenefitDeliveriesService } from '../../core/services/benefit-deliveries.service';
import { BenefitsService } from '../../core/services/benefits.service';
import { CharityProgramsService } from '../../core/services/charity-programs.service';
import { ToastService } from '../../core/services/toast.service';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { DetailGridComponent, type DetailGridItem } from '../../shared/components/detail-grid/detail-grid.component';
import { FormSelectComponent, type SelectOption } from '../../shared/components/form-select/form-select.component';
import { InputFieldComponent } from '../../shared/components/input-field/input-field.component';
import { ListPanelComponent } from '../../shared/components/list-panel/list-panel.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { ModalService } from '../../shared/components/modal/modal.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import {
  navigateWithMergedQuery,
  normalizeEmptyQueryValue,
  readNumberQueryParam,
} from '../../shared/utils/list-query.utils';
import {
  DEFAULT_PAGE_SIZE,
  DEFAULT_PAGINATION_META,
} from '../../shared/utils/pagination.utils';
import {
  applyServerValidationErrors,
  prepareFormForSubmit,
  touchAll,
} from '../../shared/utils/form.utils';
import { formatCpfForDisplay } from '../../shared/utils/validation.utils';

const OPTION_PAGE_SIZE = 100;

@Component({
  selector: 'app-benefit-deliveries-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslateModule,
    DatePipe,
    PageHeaderComponent,
    ListPanelComponent,
    ButtonComponent,
    DetailGridComponent,
    FormSelectComponent,
    InputFieldComponent,
    ModalComponent,
  ],
  templateUrl: './benefit-deliveries.page.html',
  styleUrl: './benefit-deliveries.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BenefitDeliveriesPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly benefitDeliveriesService = inject(BenefitDeliveriesService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly charityProgramsService = inject(CharityProgramsService);
  private readonly beneficiariesService = inject(BeneficiariesService);
  private readonly benefitsService = inject(BenefitsService);
  private readonly toastService = inject(ToastService);
  private readonly modalService = inject(ModalService);
  private editorDialogRef: DialogRef<unknown> | null = null;

  readonly listState = computed(() =>
    this.benefitDeliveriesService.listState(this.filters()),
  );
  readonly deliveries = computed(() => this.listState().data?.items ?? []);
  readonly selectedDelivery = signal<BenefitDeliverySummary | null>(null);
  readonly editorTitle = computed(() =>
    this.selectedDelivery()
      ? 'features.benefitDeliveries.detailTitle'
      : 'features.benefitDeliveries.registerTitle',
  );
  readonly editorDescription = computed(() =>
    this.selectedDelivery()
      ? 'features.benefitDeliveries.detailDescription'
      : 'features.benefitDeliveries.formDescription',
  );
  readonly pagination = computed(
    () => this.listState().data?.meta ?? DEFAULT_PAGINATION_META,
  );
  readonly programsState = computed(() =>
    this.charityProgramsService.listState({
      pageSize: OPTION_PAGE_SIZE,
      status: CharityProgramStatus.Active,
    }),
  );
  readonly programs = computed(() => this.programsState().data?.items ?? []);
  readonly filterBeneficiaries = signal<BeneficiarySummary[]>([]);
  readonly formBeneficiaries = signal<BeneficiarySummary[]>([]);
  readonly benefitsState = computed(() =>
    this.benefitsService.listState({ pageSize: OPTION_PAGE_SIZE }),
  );
  readonly benefits = computed(() => this.benefitsState().data?.items ?? []);
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
  readonly submitPending = signal(false);
  
  readonly filters = signal({
    beneficiaryId: '',
    charityProgramId: '',
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  readonly pageSizes = [10, 25, 50];
  
  readonly filterForm = this.formBuilder.nonNullable.group({
    beneficiaryId: [''],
    charityProgramId: [''],
    pageSize: [DEFAULT_PAGE_SIZE],
  });

  readonly form = this.formBuilder.nonNullable.group({
    beneficiaryId: ['', Validators.required],
    benefitId: ['', Validators.required],
    charityProgramId: ['', Validators.required],
    quantity: [1, [Validators.required, Validators.min(1)]],
    deliveryDate: [new Date().toISOString().slice(0, 10), Validators.required],
    notes: [''],
    reference: ['', [Validators.required, Validators.maxLength(80)]],
  });
  
  readonly programOptions = computed<SelectOption[]>(() =>
    this.programs().map((program) => ({ value: program.id, label: program.name })),
  );
  readonly filterBeneficiaryOptions = signal<SelectOption[]>([]);
  readonly formBeneficiaryOptions = signal<SelectOption[]>([]);
  readonly benefitOptions = computed<SelectOption[]>(() =>
    this.benefits().map((benefit) => ({ value: benefit.id, label: benefit.name })),
  );
  readonly selectedDeliveryDetails = signal<DetailGridItem[]>([]);
  private readonly beneficiaryOptionsRequests = new Map<
    string,
    Observable<BeneficiarySummary[]>
  >();

  ngOnInit() {
    this.charityProgramsService.ensureList({
      pageSize: OPTION_PAGE_SIZE,
      status: CharityProgramStatus.Active,
    });
    this.benefitsService.ensureList({ pageSize: OPTION_PAGE_SIZE });

    this.filterForm.controls.charityProgramId.valueChanges
      .pipe(startWith(this.filterForm.controls.charityProgramId.value), distinctUntilChanged())
      .subscribe((programId) => {
        if (!programId) {
          this.filterForm.controls.beneficiaryId.setValue('', { emitEvent: false });
        }
        this.loadBeneficiaryOptions(programId, 'filter');
      });

    this.form.controls.charityProgramId.valueChanges
      .pipe(startWith(this.form.controls.charityProgramId.value), distinctUntilChanged())
      .subscribe((programId) => {
        this.form.controls.beneficiaryId.setValue('', { emitEvent: false });
        this.loadBeneficiaryOptions(programId, 'form');
      });

    this.route.queryParamMap.subscribe((params) => {
      const nextFilters = {
        beneficiaryId: params.get('beneficiaryId') ?? '',
        charityProgramId: params.get('charityProgramId') ?? '',
        page: readNumberQueryParam(params, 'page', DEFAULT_PAGINATION_META.page),
        pageSize: readNumberQueryParam(params, 'pageSize', DEFAULT_PAGINATION_META.pageSize),
      };
      this.filters.set(nextFilters);
      this.filterForm.patchValue(nextFilters, { emitEvent: false });
      this.loadBeneficiaryOptions(nextFilters.charityProgramId, 'filter');
      this.load();
    });
  }

  load(force = false) {
    const query = this.filters();

    if (force) {
      this.benefitDeliveriesService.invalidateList(query);
    }

    this.benefitDeliveriesService.ensureList(query);
  }

  refresh() {
    this.benefitDeliveriesService.refreshList(this.filters());
    this.charityProgramsService.refreshList({
      pageSize: OPTION_PAGE_SIZE,
      status: CharityProgramStatus.Active,
    });
    this.benefitsService.refreshList({ pageSize: OPTION_PAGE_SIZE });
  }

  applyFilters() {
    const { beneficiaryId, charityProgramId } = this.filterForm.getRawValue();

    void navigateWithMergedQuery(this.router, this.route, {
      beneficiaryId: normalizeEmptyQueryValue(beneficiaryId),
      charityProgramId: normalizeEmptyQueryValue(charityProgramId),
      page: 1,
      pageSize: this.filterForm.controls.pageSize.value,
    });
  }

  changePage(page: number) {
    const pagination = this.pagination();

    if (page < 1 || page > pagination.totalPages || page === pagination.page) {
      return;
    }

    void navigateWithMergedQuery(this.router, this.route, { page });
  }

  changePageSize(pageSize: number) {
    void navigateWithMergedQuery(this.router, this.route, {
      page: 1,
      pageSize: pageSize || DEFAULT_PAGE_SIZE,
    });
  }

  selectDelivery(delivery: BenefitDeliverySummary) {
    this.selectedDelivery.set(delivery);
    this.selectedDeliveryDetails.set([
      { label: 'forms.beneficiary', value: delivery.beneficiary.fullName },
      { label: 'forms.document', value: formatCpfForDisplay(delivery.beneficiary.document) },
      { label: 'forms.charityProgram', value: delivery.charityProgram.name },
      { label: 'forms.benefit', value: delivery.benefit.name },
      { label: 'forms.quantity', value: delivery.quantity },
      { label: 'forms.deliveryDate', value: delivery.deliveryDate, format: 'date' },
      { label: 'forms.administrator', value: delivery.administrator.name },
      { label: 'forms.reference', value: `#${delivery.reference}` },
      { label: 'forms.notes', value: delivery.notes, fullWidth: true },
    ]);
  }

  openCreate(template: TemplateRef<unknown>) {
    this.startCreate();
    this.openEditorDialog(template);
  }

  openDelivery(delivery: BenefitDeliverySummary, template: TemplateRef<unknown>) {
    this.selectDelivery(delivery);
    this.openEditorDialog(template);
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

  startCreate() {
    this.selectedDelivery.set(null);
    this.selectedDeliveryDetails.set([]);
    this.form.reset({
      beneficiaryId: '',
      benefitId: '',
      charityProgramId: '',
      quantity: 1,
      deliveryDate: new Date().toISOString().slice(0, 10),
      notes: '',
      reference: '',
    });
  }

  submit() {
    if (this.submitPending()) {
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

    const raw = this.form.getRawValue();
    this.submitPending.set(true);
    this.benefitDeliveriesService
      .create({
        ...raw,
        notes: raw.notes || null,
      })
      .subscribe({
        next: () => {
          this.submitPending.set(false);
          this.toastService.show({
            type: 'success',
            text: 'Delivery registered successfully.',
          });
          this.startCreate();
          this.closeEditorDialog();
          this.load(true);
        },
        error: (error) => {
          this.submitPending.set(false);
          applyServerValidationErrors(this.form, error);
        },
      });
  }

  private loadBeneficiaryOptions(
    charityProgramId: string,
    target: 'filter' | 'form',
  ) {
    const requestKey = charityProgramId || '__all__';
    let request$ = this.beneficiaryOptionsRequests.get(requestKey);

    if (!request$) {
      request$ = this.beneficiariesService
        .listCached({ charityProgramId: charityProgramId || undefined, pageSize: OPTION_PAGE_SIZE })
        .pipe(
          map((response) => response.items),
          finalize(() => this.beneficiaryOptionsRequests.delete(requestKey)),
          shareReplay({ bufferSize: 1, refCount: true }),
        );
      this.beneficiaryOptionsRequests.set(requestKey, request$);
    }

    request$.subscribe((beneficiaries) => {
      const options = beneficiaries.map((beneficiary) => ({
        value: beneficiary.id,
        label: beneficiary.fullName,
      }));

      if (target === 'filter') {
        this.filterBeneficiaries.set(beneficiaries);
        this.filterBeneficiaryOptions.set(options);
        return;
      }

      this.formBeneficiaries.set(beneficiaries);
      this.formBeneficiaryOptions.set(options);
    });
  }
}
