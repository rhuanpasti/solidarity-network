import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import {
  BRAZIL_COUNTRY,
  BeneficiaryStatus,
  WORLD_COUNTRY,
  formatBrazilianPostalCode,
  isBrazilCountry,
  type PaginationMeta,
  type BeneficiarySummary,
  type CharityProgramSummary,
  type SupportedCountry,
} from '@solidarity-network/shared';
import { distinctUntilChanged, startWith } from 'rxjs';
import { BeneficiariesService } from '../../core/services/beneficiaries.service';
import { CharityProgramsService } from '../../core/services/charity-programs.service';
import { ToastService } from '../../core/services/toast.service';
import { CrudFormController } from '../../shared/utils/crud-form.controller';
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
import {
  brazilianPhoneValidator,
  brazilianPostalCodeValidator,
  cpfValidator,
} from '../../shared/utils/validation.utils';

interface GeneratedCredentialInfo {
  fullName: string;
  email: string;
  passkey: string;
}

export type BeneficiaryAddressForm = FormGroup<{
  postalCode: FormControl<string>;
  country: FormControl<SupportedCountry>;
  street: FormControl<string>;
  number: FormControl<string>;
  district: FormControl<string>;
  city: FormControl<string>;
  state: FormControl<string>;
  complement: FormControl<string>;
}>;

export type BeneficiaryFiltersForm = FormGroup<{
  search: FormControl<string>;
  charityProgramId: FormControl<string>;
  status: FormControl<string>;
  pageSize: FormControl<number>;
}>;

export type BeneficiaryForm = FormGroup<{
  fullName: FormControl<string>;
  document: FormControl<string>;
  birthDate: FormControl<string>;
  email: FormControl<string>;
  phone: FormControl<string>;
  notes: FormControl<string>;
  charityProgramId: FormControl<string>;
  status: FormControl<BeneficiaryStatus>;
  address: BeneficiaryAddressForm;
}>;

const PROGRAM_OPTIONS_PAGE_SIZE = 100;

@Injectable()
export class BeneficiariesState {
  readonly BeneficiaryStatus = BeneficiaryStatus;
  readonly countryOptions: SupportedCountry[] = [BRAZIL_COUNTRY, WORLD_COUNTRY];

  private readonly formBuilder = inject(FormBuilder);
  private readonly beneficiariesService = inject(BeneficiariesService);
  private readonly charityProgramsService = inject(CharityProgramsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly items = signal<BeneficiarySummary[]>([]);
  readonly programs = signal<CharityProgramSummary[]>([]);
  readonly pagination = signal<PaginationMeta>(DEFAULT_PAGINATION_META);
  readonly generatedCredential = signal<GeneratedCredentialInfo | null>(null);
  readonly selectedCountry = signal<SupportedCountry>(BRAZIL_COUNTRY);
  readonly addressLookupPending = signal(false);
  readonly addressLookupMessageKey = signal<string | null>(null);
  readonly listLoading = signal(false);
  readonly submitPending = signal(false);
  readonly isBrazilSelected = computed(() => isBrazilCountry(this.selectedCountry()));
  readonly documentLabelKey = computed(() =>
    this.isBrazilSelected() ? 'forms.cpf' : 'forms.document',
  );

  readonly filters = signal({
    search: '',
    charityProgramId: '',
    status: '',
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  readonly pageSizes = [10, 25, 50];

  readonly filterForm: BeneficiaryFiltersForm = this.formBuilder.nonNullable.group({
    search: [''],
    charityProgramId: [''],
    status: [''],
    pageSize: [DEFAULT_PAGE_SIZE],
  });

  readonly form: BeneficiaryForm = this.formBuilder.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(160)]],
    document: ['', [Validators.required, Validators.maxLength(40)]],
    birthDate: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.maxLength(30)]],
    notes: [''],
    charityProgramId: [''],
    status: this.formBuilder.nonNullable.control<BeneficiaryStatus>(
      BeneficiaryStatus.Active,
      {
        validators: [Validators.required],
      },
    ),
    address: this.formBuilder.nonNullable.group({
      postalCode: ['', Validators.required],
      country: this.formBuilder.nonNullable.control<SupportedCountry>(
        BRAZIL_COUNTRY,
        {
          validators: [Validators.required],
        },
      ),
      street: ['', Validators.required],
      number: ['', Validators.required],
      district: ['', Validators.required],
      city: ['', Validators.required],
      state: ['', Validators.required],
      complement: [''],
    }),
  });

  readonly editor = new CrudFormController<BeneficiarySummary>({
    form: this.form,
    onCreate: () => {
      this.form.reset({
        fullName: '',
        document: '',
        birthDate: '',
        email: '',
        phone: '',
        notes: '',
        charityProgramId: '',
        status: BeneficiaryStatus.Active,
        address: {
          postalCode: '',
          country: BRAZIL_COUNTRY,
          street: '',
          number: '',
          district: '',
          city: '',
          state: '',
          complement: '',
        },
      });
      this.generatedCredential.set(null);
      this.addressLookupMessageKey.set(null);
    },
    onView: (item) => {
      this.form.reset({
        fullName: item.fullName,
        document: item.document,
        birthDate: item.birthDate ? item.birthDate.slice(0, 10) : '',
        email: item.email ?? '',
        phone: item.phone,
        notes: item.notes ?? '',
        charityProgramId: item.charityProgram?.id ?? '',
        status: item.status,
        address: {
          postalCode: item.address.postalCode,
          country: item.address.country,
          street: item.address.street,
          number: item.address.number,
          district: item.address.district,
          city: item.address.city,
          state: item.address.state,
          complement: item.address.complement ?? '',
        },
      });
      this.generatedCredential.set(null);
      this.addressLookupMessageKey.set(null);
    },
  });

  readonly selected = this.editor.selected;
  
  readonly isReadOnly = this.editor.isReadOnly;

  initialize() {
    this.watchCountrySelection();
    this.charityProgramsService
      .list({ pageSize: PROGRAM_OPTIONS_PAGE_SIZE })
      .subscribe((response) => this.programs.set(response.items));
    this.route.queryParamMap.subscribe((params) => {
      const nextFilters = {
        search: params.get('search') ?? '',
        charityProgramId: params.get('charityProgramId') ?? '',
        status: params.get('status') ?? '',
        page: readNumberQueryParam(params, 'page', DEFAULT_PAGINATION_META.page),
        pageSize: readNumberQueryParam(params, 'pageSize', DEFAULT_PAGINATION_META.pageSize),
      };
      this.filters.set(nextFilters);
      this.filterForm.patchValue(nextFilters, { emitEvent: false });
      this.load();
    });
  }

  load() {
    this.listLoading.set(true);
    this.beneficiariesService.list(this.filters()).subscribe({
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

  applyFilters() {
    const { search, charityProgramId, status } = this.filterForm.getRawValue();

    void navigateWithMergedQuery(this.router, this.route, {
      search: normalizeEmptyQueryValue(search),
      charityProgramId: normalizeEmptyQueryValue(charityProgramId),
      status: normalizeEmptyQueryValue(status),
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

  submit() {
    if (this.submitPending() || this.isReadOnly()) {
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
    const payload = {
      ...raw,
      notes: raw.notes || null,
      charityProgramId: raw.charityProgramId || null,
    };

    if (this.selected()) {
      this.submitPending.set(true);
      this.beneficiariesService.update(this.selected()!.id, payload).subscribe({
        next: () => {
          this.submitPending.set(false);
          this.toastService.show({ type: 'success', text: 'Saved successfully.' });
          this.editor.startCreate();
          this.load();
        },
        error: (error) => {
          this.submitPending.set(false);
          applyServerValidationErrors(this.form, error);
        },
      });
      return;
    }

    this.submitPending.set(true);
    this.beneficiariesService.create(payload).subscribe({
      next: (response) => {
        this.submitPending.set(false);
        this.toastService.show({ type: 'success', text: 'Saved successfully.' });
        this.generatedCredential.set({
          fullName: response.beneficiary.fullName,
          email: response.beneficiary.email ?? payload.email,
          passkey: response.generatedPasskey,
        });
        this.editor.startCreate();
        this.load();
      },
      error: (error) => {
        this.submitPending.set(false);
        applyServerValidationErrors(this.form, error);
      },
    });
  }

  lookupAddressByPostalCode() {
    if (!this.isBrazilSelected()) {
      return;
    }

    const postalCodeControl = this.form.controls.address.controls.postalCode;
    postalCodeControl.setValue(formatBrazilianPostalCode(postalCodeControl.value), {
      emitEvent: false,
    });
    postalCodeControl.markAsTouched();
    postalCodeControl.updateValueAndValidity({ emitEvent: false });

    if (postalCodeControl.invalid) {
      this.addressLookupMessageKey.set(null);
      return;
    }

    this.addressLookupPending.set(true);
    this.addressLookupMessageKey.set('validation.searchingPostalCode');
    this.beneficiariesService.lookupAddress(postalCodeControl.value).subscribe({
      next: (address) => {
        const currentAddress = this.form.controls.address.getRawValue();
        this.form.controls.address.patchValue(
          {
            postalCode: address.postalCode ?? currentAddress.postalCode,
            country: BRAZIL_COUNTRY,
            street: address.street ?? currentAddress.street,
            district: address.district ?? currentAddress.district,
            city: address.city ?? currentAddress.city,
            state: address.state ?? currentAddress.state,
            complement: address.complement ?? currentAddress.complement,
          },
          { emitEvent: false },
        );
        this.addressLookupPending.set(false);
        this.addressLookupMessageKey.set('validation.addressAutoFilled');
      },
      error: () => {
        this.addressLookupPending.set(false);
        this.addressLookupMessageKey.set('validation.postalCodeLookupFailed');
      },
    });
  }

  countryLabelKey(country: SupportedCountry) {
    return country === BRAZIL_COUNTRY ? 'countries.brazil' : 'countries.world';
  }

  private watchCountrySelection() {
    this.form.controls.address.controls.country.valueChanges
      .pipe(
        startWith(this.form.controls.address.controls.country.value),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((country) => {
        this.selectedCountry.set(country);
        this.applyCountryValidators(country);

        if (!isBrazilCountry(country)) {
          this.addressLookupPending.set(false);
          this.addressLookupMessageKey.set(null);
        }
      });
  }

  private applyCountryValidators(country: SupportedCountry) {
    const documentValidators = [Validators.required, Validators.maxLength(40)];
    const phoneValidators = [Validators.required, Validators.maxLength(30)];
    const postalCodeValidators = [Validators.required];

    if (isBrazilCountry(country)) {
      documentValidators.push(cpfValidator());
      phoneValidators.push(brazilianPhoneValidator());
      postalCodeValidators.push(brazilianPostalCodeValidator());
    }

    this.form.controls.document.setValidators(documentValidators);
    this.form.controls.phone.setValidators(phoneValidators);
    this.form.controls.address.controls.postalCode.setValidators(postalCodeValidators);

    this.form.controls.document.updateValueAndValidity({ emitEvent: false });
    this.form.controls.phone.updateValueAndValidity({ emitEvent: false });
    this.form.controls.address.controls.postalCode.updateValueAndValidity({
      emitEvent: false,
    });
  }
}
