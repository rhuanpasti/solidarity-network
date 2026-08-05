import { DatePipe } from '@angular/common';
import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import type { TemplateRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import {
  BenefitDeliverySummary,
  BenefitSummary,
  BeneficiarySummary,
  CharityProgramStatus,
  CharityProgramSummary,
  PaginationMeta,
} from '@solidarity-network/shared';
import { distinctUntilChanged, startWith } from 'rxjs';
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

  readonly deliveries = signal<BenefitDeliverySummary[]>([]);
  readonly selectedDelivery = signal<BenefitDeliverySummary | null>(null);
  readonly pagination = signal<PaginationMeta>(DEFAULT_PAGINATION_META);
  readonly programs = signal<CharityProgramSummary[]>([]);
  readonly filterBeneficiaries = signal<BeneficiarySummary[]>([]);
  readonly formBeneficiaries = signal<BeneficiarySummary[]>([]);
  readonly benefits = signal<BenefitSummary[]>([]);
  readonly listLoading = signal(false);
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
  
  readonly programOptions = signal<SelectOption[]>([]);
  readonly filterBeneficiaryOptions = signal<SelectOption[]>([]);
  readonly formBeneficiaryOptions = signal<SelectOption[]>([]);
  readonly benefitOptions = signal<SelectOption[]>([]);
  readonly selectedDeliveryDetails = signal<DetailGridItem[]>([]);

  ngOnInit() {
    this.charityProgramsService
      .list({ pageSize: OPTION_PAGE_SIZE, status: CharityProgramStatus.Active })
      .subscribe((response) => {
        this.programs.set(response.items);
        this.programOptions.set(
          response.items.map((program) => ({ value: program.id, label: program.name })),
        );
      });
    this.benefitsService.list({ pageSize: OPTION_PAGE_SIZE }).subscribe((response) => {
      this.benefits.set(response.items);
      this.benefitOptions.set(
        response.items.map((benefit) => ({ value: benefit.id, label: benefit.name })),
      );
    });

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

  load() {
    this.listLoading.set(true);
    this.benefitDeliveriesService.list(this.filters()).subscribe({
      next: (response) => {
        this.listLoading.set(false);
        this.deliveries.set(response.items);
        this.pagination.set(response.meta);
      },
      error: () => {
        this.listLoading.set(false);
      },
    });
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

  changePageSize(pageSize: string) {
    void navigateWithMergedQuery(this.router, this.route, {
      page: 1,
      pageSize: Number(pageSize) || DEFAULT_PAGE_SIZE,
    });
  }

  selectDelivery(delivery: BenefitDeliverySummary) {
    this.selectedDelivery.set(delivery);
    this.selectedDeliveryDetails.set([
      { label: 'forms.beneficiary', value: delivery.beneficiary.fullName },
      { label: 'forms.document', value: delivery.beneficiary.document },
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
          this.load();
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
    this.beneficiariesService
      .list({ charityProgramId: charityProgramId || undefined, pageSize: OPTION_PAGE_SIZE })
      .subscribe((response) => {
        const options = response.items.map((beneficiary) => ({
          value: beneficiary.id,
          label: beneficiary.fullName,
        }));

        if (target === 'filter') {
          this.filterBeneficiaries.set(response.items);
          this.filterBeneficiaryOptions.set(options);
          return;
        }

        this.formBeneficiaries.set(response.items);
        this.formBeneficiaryOptions.set(options);
      });
  }
}
