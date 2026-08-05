import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import {
  BRAZIL_COUNTRY,
  BeneficiaryDependentRelationship,
  BeneficiaryStatus,
  WORLD_COUNTRY,
  formatBrazilianPostalCode,
  isBrazilCountry,
  type BeneficiarySummary,
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
  brazilianPostalCodeValidator,
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

export type BeneficiaryDependentForm = FormGroup<{
  fullName: FormControl<string>;
  relationship: FormControl<BeneficiaryDependentRelationship>;
  document: FormControl<string>;
  birthDate: FormControl<string>;
}>;

export type BeneficiaryForm = FormGroup<{
  fullName: FormControl<string>;
  document: FormControl<string>;
  birthDate: FormControl<string>;
  email: FormControl<string>;
  phone: FormControl<string>;
  notes: FormControl<string>;
  dependents: FormArray<BeneficiaryDependentForm>;
  charityProgramIds: FormControl<string[]>;
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
  readonly listState = computed(() =>
    this.beneficiariesService.listState(this.filters()),
  );
  readonly items = computed(() => this.listState().data?.items ?? []);
  readonly programsState = computed(() =>
    this.charityProgramsService.listState({ pageSize: PROGRAM_OPTIONS_PAGE_SIZE }),
  );
  readonly programs = computed(() => this.programsState().data?.items ?? []);
  readonly pagination = computed(
    () => this.listState().data?.meta ?? DEFAULT_PAGINATION_META,
  );
  readonly generatedCredential = signal<GeneratedCredentialInfo | null>(null);
  readonly selectedCountry = signal<SupportedCountry>(BRAZIL_COUNTRY);
  readonly addressLookupPending = signal(false);
  readonly addressLookupMessageKey = signal<string | null>(null);
  readonly listLoading = computed(
    () => this.listState().loading && !this.listState().data,
  );
  readonly submitPending = signal(false);
  readonly isBrazilSelected = computed(() => isBrazilCountry(this.selectedCountry()));
  readonly documentLabelKey = 'forms.document';

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
    dependents: this.formBuilder.array<BeneficiaryDependentForm>([]),
    charityProgramIds: this.formBuilder.nonNullable.control<string[]>([]),
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
      this.form.controls.dependents.clear();
      this.form.reset({
        fullName: '',
        document: '',
        birthDate: '',
        email: '',
        phone: '',
        notes: '',
        charityProgramIds: [],
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
      this.form.controls.dependents.clear();
      this.form.reset({
        fullName: item.fullName,
        document: item.document,
        birthDate: item.birthDate ? item.birthDate.slice(0, 10) : '',
        email: item.email ?? '',
        phone: item.phone,
        notes: item.notes ?? '',
        charityProgramIds: item.charityPrograms.map((program) => program.id),
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
      item.dependents.forEach((dependent) => {
        this.form.controls.dependents.push(
          this.createDependentForm({
            fullName: dependent.fullName,
            relationship: dependent.relationship,
            document: dependent.document ?? '',
            birthDate: dependent.birthDate.slice(0, 10),
          }),
        );
      });
      this.generatedCredential.set(null);
      this.addressLookupMessageKey.set(null);
    },
  });

  readonly selected = this.editor.selected;
  
  readonly isReadOnly = this.editor.isReadOnly;
  readonly dependentRelationshipOptions = [
    {
      value: BeneficiaryDependentRelationship.Child,
      translationKey: 'enums.dependentRelationships.child',
    },
    {
      value: BeneficiaryDependentRelationship.Grandchild,
      translationKey: 'enums.dependentRelationships.grandchild',
    },
    {
      value: BeneficiaryDependentRelationship.Other,
      translationKey: 'enums.dependentRelationships.other',
    },
  ];

  initialize() {
    this.watchCountrySelection();
    this.charityProgramsService.ensureList({ pageSize: PROGRAM_OPTIONS_PAGE_SIZE });
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

  load(force = false) {
    const query = this.filters();

    if (force) {
      this.beneficiariesService.invalidateList(query);
    }

    this.beneficiariesService.ensureList(query);
  }

  refresh() {
    this.beneficiariesService.refreshList(this.filters());
    this.charityProgramsService.refreshList({ pageSize: PROGRAM_OPTIONS_PAGE_SIZE });
  }

  refreshState() {
    return this.listState();
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
      dependents: raw.dependents.map((dependent) => ({
        ...dependent,
        document: dependent.document.trim() || null,
      })),
      charityProgramIds: raw.charityProgramIds,
    };

    if (this.selected()) {
      this.submitPending.set(true);
      this.beneficiariesService.update(this.selected()!.id, payload).subscribe({
        next: () => {
          this.submitPending.set(false);
          this.toastService.show({ type: 'success', text: 'Saved successfully.' });
          this.editor.startCreate();
          this.load(true);
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
        this.load(true);
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

  addDependent() {
    if (this.isReadOnly()) {
      return;
    }

    this.form.controls.dependents.push(this.createDependentForm());
  }

  removeDependent(index: number) {
    if (this.isReadOnly()) {
      return;
    }

    this.form.controls.dependents.removeAt(index);
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
    const postalCodeValidators = [Validators.required];

    if (isBrazilCountry(country)) {
      postalCodeValidators.push(brazilianPostalCodeValidator());
    }

    this.form.controls.address.controls.postalCode.setValidators(postalCodeValidators);

    this.form.controls.address.controls.postalCode.updateValueAndValidity({
      emitEvent: false,
    });
  }

  private createDependentForm(value?: {
    fullName: string;
    relationship: BeneficiaryDependentRelationship;
    document: string;
    birthDate: string;
  }) {
    return this.formBuilder.nonNullable.group({
      fullName: [
        value?.fullName ?? '',
        [Validators.required, Validators.maxLength(160)],
      ],
      relationship: this.formBuilder.nonNullable.control(
        value?.relationship ?? BeneficiaryDependentRelationship.Child,
        { validators: [Validators.required] },
      ),
      document: [value?.document ?? '', Validators.maxLength(40)],
      birthDate: [
        value?.birthDate ?? '',
        [Validators.required, dependentUnder18Validator()],
      ],
    });
  }
}

function dependentUnder18Validator() {
  return (control: AbstractControl<string>): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const birthDate = new Date(control.value);
    const now = new Date();

    if (Number.isNaN(birthDate.getTime()) || birthDate > now) {
      return { dependentUnder18: true };
    }

    const eighteenthBirthday = new Date(birthDate);
    eighteenthBirthday.setUTCFullYear(eighteenthBirthday.getUTCFullYear() + 18);

    return eighteenthBirthday > now ? null : { dependentUnder18: true };
  };
}
