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
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { touchAll } from '../../shared/utils/form.utils';
import { ToastService } from '../../core/services/toast.service';
import { AdministratorsApi } from '../administrators/administrators.api';
import { BenefitDeliveriesApi } from './benefit-deliveries.api';
import { BeneficiariesApi } from '../beneficiaries/beneficiaries.api';
import { BenefitsApi } from '../benefits/benefits.api';
import { CharityProgramsApi } from '../charity-programs/charity-programs.api';

@Component({
  selector: 'sn-benefit-deliveries-page',
  standalone: true,
  imports: [ReactiveFormsModule, TranslateModule, DatePipe, PageHeaderComponent, EmptyStateComponent],
  templateUrl: './benefit-deliveries.page.html',
  styleUrl: './benefit-deliveries.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BenefitDeliveriesPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly api = inject(BenefitDeliveriesApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly programsApi = inject(CharityProgramsApi);
  private readonly beneficiariesApi = inject(BeneficiariesApi);
  private readonly benefitsApi = inject(BenefitsApi);
  private readonly administratorsApi = inject(AdministratorsApi);
  private readonly toastService = inject(ToastService);

  readonly deliveries = signal<BenefitDeliverySummary[]>([]);
  readonly programs = signal<CharityProgramSummary[]>([]);
  readonly beneficiaries = signal<BeneficiarySummary[]>([]);
  readonly benefits = signal<BenefitSummary[]>([]);
  readonly administrators = signal<AdministratorSummary[]>([]);
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
    this.programsApi.list().subscribe((response) => this.programs.set(response.items));
    this.beneficiariesApi.list().subscribe((response) => this.beneficiaries.set(response.items));
    this.benefitsApi.list().subscribe((response) => this.benefits.set(response.items));
    this.administratorsApi.list().subscribe((response) => this.administrators.set(response.items));

    this.route.queryParamMap.subscribe((params) => {
      this.filters.set({
        beneficiaryId: params.get('beneficiaryId') ?? '',
        charityProgramId: params.get('charityProgramId') ?? '',
      });
      this.load();
    });
  }

  load() {
    this.api.list(this.filters()).subscribe((response) => this.deliveries.set(response.items));
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
      return;
    }

    const raw = this.form.getRawValue();
    this.api
      .create({
        ...raw,
        notes: raw.notes || null,
      })
      .subscribe(() => {
        this.toastService.show({ type: 'success', text: 'Delivery registered successfully.' });
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
