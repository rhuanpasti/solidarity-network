import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import type {
  AdministratorSummary,
  BenefitDeliverySummary,
  BenefitSummary,
  BeneficiarySummary,
  CharityProgramSummary,
} from '@solidarity-network/shared';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { FormErrorComponent } from '../../shared/components/form-error/form-error.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { shouldShowControlError, touchAll } from '../../shared/utils/form.utils';
import { AdministratorsService } from '../../core/services/administrators.service';
import { BeneficiariesService } from '../../core/services/beneficiaries.service';
import { BenefitDeliveriesService } from '../../core/services/benefit-deliveries.service';
import { BenefitsService } from '../../core/services/benefits.service';
import { CharityProgramsService } from '../../core/services/charity-programs.service';
import { ToastService } from '../../core/services/toast.service';

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
  private readonly administratorsService = inject(AdministratorsService);
  private readonly toastService = inject(ToastService);

  readonly deliveries = signal<BenefitDeliverySummary[]>([]);
  readonly programs = signal<CharityProgramSummary[]>([]);
  readonly beneficiaries = signal<BeneficiarySummary[]>([]);
  readonly benefits = signal<BenefitSummary[]>([]);
  readonly administrators = signal<AdministratorSummary[]>([]);
  readonly showControlError = shouldShowControlError;
  readonly filters = signal({
    beneficiaryId: '',
    charityProgramId: '',
  });

  filteredBeneficiaries() {
    const programId = this.form.controls.charityProgramId.value;
    if (!programId) {
      return this.beneficiaries();
    }

    return this.beneficiaries().filter(
      (beneficiary) => beneficiary.charityProgram.id === programId,
    );
  }

  filteredAdministrators() {
    const programId = this.form.controls.charityProgramId.value;
    if (!programId) {
      return this.administrators();
    }

    return this.administrators().filter((administrator) =>
      administrator.charityPrograms.some((program) => program.id === programId),
    );
  }

  readonly form = this.formBuilder.nonNullable.group({
    beneficiaryId: ['', Validators.required],
    benefitId: ['', Validators.required],
    charityProgramId: ['', Validators.required],
    quantity: [1, [Validators.required, Validators.min(1)]],
    deliveryDate: [new Date().toISOString().slice(0, 10), Validators.required],
    notes: [''],
    administratorId: ['', Validators.required],
    reference: ['', [Validators.required, Validators.maxLength(80)]],
  });

  ngOnInit() {
    this.charityProgramsService
      .list()
      .subscribe((response) => this.programs.set(response.items));
    this.beneficiariesService
      .list()
      .subscribe((response) => this.beneficiaries.set(response.items));
    this.benefitsService
      .list()
      .subscribe((response) => this.benefits.set(response.items));
    this.administratorsService
      .list()
      .subscribe((response) => this.administrators.set(response.items));

    this.route.queryParamMap.subscribe((params) => {
      this.filters.set({
        beneficiaryId: params.get('beneficiaryId') ?? '',
        charityProgramId: params.get('charityProgramId') ?? '',
      });
      this.load();
    });
  }

  load() {
    this.benefitDeliveriesService
      .list(this.filters())
      .subscribe((response) => this.deliveries.set(response.items));
  }

  applyFilters(beneficiaryId: string, charityProgramId: string) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        beneficiaryId: beneficiaryId || null,
        charityProgramId: charityProgramId || null,
      },
      queryParamsHandling: 'merge',
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

    const raw = this.form.getRawValue();
    this.benefitDeliveriesService
      .create({
        ...raw,
        notes: raw.notes || null,
      })
      .subscribe(() => {
        this.toastService.show({
          type: 'success',
          text: 'Delivery registered successfully.',
        });
        this.form.patchValue({
          beneficiaryId: '',
          benefitId: '',
          charityProgramId: '',
          quantity: 1,
          deliveryDate: new Date().toISOString().slice(0, 10),
          notes: '',
          administratorId: '',
          reference: '',
        });
        this.load();
      });
  }
}
