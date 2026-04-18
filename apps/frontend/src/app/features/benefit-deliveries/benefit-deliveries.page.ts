import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import type {
  BenefitDeliverySummary,
  BenefitSummary,
  BeneficiarySummary,
  CharityProgramSummary,
  PaginationMeta,
} from '@solidarity-network/shared';
import { distinctUntilChanged, startWith } from 'rxjs';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { FormErrorComponent } from '../../shared/components/form-error/form-error.component';
import { InputFieldComponent } from '../../shared/components/input-field/input-field.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import {
  applyServerValidationErrors,
  clearServerValidationErrors,
  shouldShowControlError,
  touchAll,
} from '../../shared/utils/form.utils';
import { BeneficiariesService } from '../../core/services/beneficiaries.service';
import { BenefitDeliveriesService } from '../../core/services/benefit-deliveries.service';
import { BenefitsService } from '../../core/services/benefits.service';
import { CharityProgramsService } from '../../core/services/charity-programs.service';
import { ToastService } from '../../core/services/toast.service';

const DEFAULT_PAGE_SIZE = 10;
const OPTION_PAGE_SIZE = 100;
const EMPTY_PAGINATION_META: PaginationMeta = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  totalItems: 0,
  totalPages: 1,
};

@Component({
  selector: 'app-benefit-deliveries-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslateModule,
    DatePipe,
    PageHeaderComponent,
    EmptyStateComponent,
    ButtonComponent,
    FormErrorComponent,
    InputFieldComponent,
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

  readonly deliveries = signal<BenefitDeliverySummary[]>([]);
  readonly selectedDelivery = signal<BenefitDeliverySummary | null>(null);
  readonly pagination = signal<PaginationMeta>(EMPTY_PAGINATION_META);
  readonly programs = signal<CharityProgramSummary[]>([]);
  readonly filterBeneficiaries = signal<BeneficiarySummary[]>([]);
  readonly formBeneficiaries = signal<BeneficiarySummary[]>([]);
  readonly benefits = signal<BenefitSummary[]>([]);
  readonly listLoading = signal(false);
  readonly filterBeneficiariesLoading = signal(false);
  readonly formBeneficiariesLoading = signal(false);
  readonly submitPending = signal(false);
  readonly showControlError = shouldShowControlError;
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

  ngOnInit() {
    this.charityProgramsService
      .list({ pageSize: OPTION_PAGE_SIZE })
      .subscribe((response) => this.programs.set(response.items));
    this.benefitsService
      .list({ pageSize: OPTION_PAGE_SIZE })
      .subscribe((response) => this.benefits.set(response.items));

    this.filterForm.controls.charityProgramId.valueChanges
      .pipe(startWith(this.filterForm.controls.charityProgramId.value), distinctUntilChanged())
      .subscribe((programId) => {
        if (!programId) {
          this.filterForm.controls.beneficiaryId.setValue('', { emitEvent: false });
        }
        this.loadFilterBeneficiaries(programId);
      });

    this.form.controls.charityProgramId.valueChanges
      .pipe(startWith(this.form.controls.charityProgramId.value), distinctUntilChanged())
      .subscribe((programId) => {
        this.form.controls.beneficiaryId.setValue('', { emitEvent: false });
        this.loadFormBeneficiaries(programId);
      });

    this.route.queryParamMap.subscribe((params) => {
      const nextFilters = {
        beneficiaryId: params.get('beneficiaryId') ?? '',
        charityProgramId: params.get('charityProgramId') ?? '',
        page: Number(params.get('page') ?? EMPTY_PAGINATION_META.page) || EMPTY_PAGINATION_META.page,
        pageSize:
          Number(params.get('pageSize') ?? EMPTY_PAGINATION_META.pageSize) || EMPTY_PAGINATION_META.pageSize,
      };
      this.filters.set(nextFilters);
      this.filterForm.patchValue(nextFilters, { emitEvent: false });
      this.loadFilterBeneficiaries(nextFilters.charityProgramId);
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

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        beneficiaryId: beneficiaryId || null,
        charityProgramId: charityProgramId || null,
        page: 1,
        pageSize: this.filterForm.controls.pageSize.value,
      },
      queryParamsHandling: 'merge',
    });
  }

  changePage(page: number) {
    const pagination = this.pagination();

    if (page < 1 || page > pagination.totalPages || page === pagination.page) {
      return;
    }

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page },
      queryParamsHandling: 'merge',
    });
  }

  changePageSize(pageSize: string) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        page: 1,
        pageSize: Number(pageSize) || DEFAULT_PAGE_SIZE,
      },
      queryParamsHandling: 'merge',
    });
  }

  selectDelivery(delivery: BenefitDeliverySummary) {
    this.selectedDelivery.set(delivery);
  }

  startCreate() {
    this.selectedDelivery.set(null);
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

    if (this.form.invalid) {
      touchAll(this.form);
      this.toastService.show({
        type: 'error',
        translationKey: 'validation.reviewHighlightedFields',
      });
      return;
    }

    const raw = this.form.getRawValue();
    clearServerValidationErrors(this.form);
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
          this.load();
        },
        error: (error) => {
          this.submitPending.set(false);
          applyServerValidationErrors(this.form, error);
        },
      });
  }

  private loadFilterBeneficiaries(charityProgramId: string) {
    this.filterBeneficiariesLoading.set(true);
    this.beneficiariesService
      .list({ charityProgramId: charityProgramId || undefined, pageSize: OPTION_PAGE_SIZE })
      .subscribe({
        next: (response) => {
          this.filterBeneficiariesLoading.set(false);
          this.filterBeneficiaries.set(response.items);
        },
        error: () => {
          this.filterBeneficiariesLoading.set(false);
        },
      });
  }

  private loadFormBeneficiaries(charityProgramId: string) {
    this.formBeneficiariesLoading.set(true);
    this.beneficiariesService
      .list({ charityProgramId: charityProgramId || undefined, pageSize: OPTION_PAGE_SIZE })
      .subscribe({
        next: (response) => {
          this.formBeneficiariesLoading.set(false);
          this.formBeneficiaries.set(response.items);
        },
        error: () => {
          this.formBeneficiariesLoading.set(false);
        },
      });
  }
}
