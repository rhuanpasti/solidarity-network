import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BeneficiaryStatus, type BeneficiarySummary, type CharityProgramSummary } from '@solidarity-network/shared';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { touchAll } from '../../shared/utils/form.utils';
import { ToastService } from '../../core/services/toast.service';
import { CharityProgramsApi } from '../charity-programs/charity-programs.api';
import { BeneficiariesApi } from './beneficiaries.api';

@Component({
  selector: 'sn-beneficiaries-page',
  standalone: true,
  imports: [ReactiveFormsModule, TranslateModule, PageHeaderComponent, EmptyStateComponent],
  templateUrl: './beneficiaries.page.html',
  styleUrl: './beneficiaries.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BeneficiariesPage implements OnInit {
  readonly BeneficiaryStatus = BeneficiaryStatus;
  private readonly formBuilder = inject(FormBuilder);
  private readonly api = inject(BeneficiariesApi);
  private readonly programsApi = inject(CharityProgramsApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toastService = inject(ToastService);

  readonly items = signal<BeneficiarySummary[]>([]);
  readonly programs = signal<CharityProgramSummary[]>([]);
  readonly selected = signal<BeneficiarySummary | null>(null);
  readonly filters = signal({
    search: '',
    charityProgramId: '',
    status: '',
  });

  readonly form = this.formBuilder.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(160)]],
    document: ['', [Validators.required, Validators.maxLength(40)]],
    birthDate: [''],
    phone: ['', [Validators.required, Validators.maxLength(30)]],
    notes: [''],
    charityProgramId: ['', Validators.required],
    status: this.formBuilder.nonNullable.control<BeneficiaryStatus>(
      BeneficiaryStatus.Active,
      {
        validators: [Validators.required],
      },
    ),
    address: this.formBuilder.nonNullable.group({
      street: ['', Validators.required],
      number: ['', Validators.required],
      district: ['', Validators.required],
      city: ['', Validators.required],
      state: ['', Validators.required],
      postalCode: ['', Validators.required],
      country: ['Brazil', Validators.required],
      complement: [''],
    }),
  });

  ngOnInit() {
    this.programsApi.list().subscribe((response) => this.programs.set(response.items));
    this.route.queryParamMap.subscribe((params) => {
      const nextFilters = {
        search: params.get('search') ?? '',
        charityProgramId: params.get('charityProgramId') ?? '',
        status: params.get('status') ?? '',
      };
      this.filters.set(nextFilters);
      this.load();
    });
  }

  load() {
    this.api.list(this.filters()).subscribe((response) => this.items.set(response.items));
  }

  applyFilters(search: string, charityProgramId: string, status: string) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        search: search || null,
        charityProgramId: charityProgramId || null,
        status: status || null,
      },
      queryParamsHandling: 'merge',
    });
  }

  select(item: BeneficiarySummary) {
    this.selected.set(item);
    this.form.reset({
      fullName: item.fullName,
      document: item.document,
      birthDate: item.birthDate ? item.birthDate.slice(0, 10) : '',
      phone: item.phone,
      notes: item.notes ?? '',
      charityProgramId: item.charityProgram.id,
      status: item.status,
      address: {
        street: item.address.street,
        number: item.address.number,
        district: item.address.district,
        city: item.address.city,
        state: item.address.state,
        postalCode: item.address.postalCode,
        country: item.address.country,
        complement: item.address.complement ?? '',
      },
    });
  }

  resetForm() {
    this.selected.set(null);
    this.form.reset({
      fullName: '',
      document: '',
      birthDate: '',
      phone: '',
      notes: '',
      charityProgramId: '',
      status: BeneficiaryStatus.Active,
      address: {
        street: '',
        number: '',
        district: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'Brazil',
        complement: '',
      },
    });
  }

  submit() {
    if (this.form.invalid) {
      touchAll(this.form);
      return;
    }

    const raw = this.form.getRawValue();
    const payload = {
      ...raw,
      birthDate: raw.birthDate || null,
      notes: raw.notes || null,
    };
    const request = this.selected()
      ? this.api.update(this.selected()!.id, payload)
      : this.api.create(payload);

    request.subscribe(() => {
      this.toastService.show({ type: 'success', text: 'Saved successfully.' });
      this.resetForm();
      this.load();
    });
  }
}
