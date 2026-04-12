import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import {
  BRAZIL_COUNTRY,
  BeneficiaryStatus,
  WORLD_COUNTRY,
  formatBrazilianPostalCode,
  isBrazilCountry,
  type BeneficiarySummary,
  type CharityProgramSummary,
  type SupportedCountry,
} from '@solidarity-network/shared';
import { distinctUntilChanged, startWith } from 'rxjs';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { FormErrorComponent } from '../../shared/components/form-error/form-error.component';
import { shouldShowControlError, touchAll } from '../../shared/utils/form.utils';
import {
  brazilianPhoneValidator,
  brazilianPostalCodeValidator,
  cpfValidator,
} from '../../shared/utils/validation.utils';
import { BeneficiariesService } from '../../core/services/beneficiaries.service';
import { CharityProgramsService } from '../../core/services/charity-programs.service';
import { ToastService } from '../../core/services/toast.service';

interface GeneratedCredentialInfo {
  fullName: string;
  email: string;
  passkey: string;
}

@Component({
  selector: 'app-beneficiaries-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslateModule,
    PageHeaderComponent,
    EmptyStateComponent,
    ButtonComponent,
    FormErrorComponent,
  ],
  templateUrl: './beneficiaries.page.html',
  styleUrl: './beneficiaries.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BeneficiariesPage implements OnInit {
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
  readonly selected = signal<BeneficiarySummary | null>(null);
  readonly generatedCredential = signal<GeneratedCredentialInfo | null>(null);
  readonly selectedCountry = signal<SupportedCountry>(BRAZIL_COUNTRY);
  readonly addressLookupPending = signal(false);
  readonly addressLookupMessageKey = signal<string | null>(null);
  readonly showControlError = shouldShowControlError;
  readonly isBrazilSelected = computed(() => isBrazilCountry(this.selectedCountry()));
  readonly documentLabelKey = computed(() =>
    this.isBrazilSelected() ? 'forms.cpf' : 'forms.document',
  );
  readonly filters = signal({
    search: '',
    charityProgramId: '',
    status: '',
  });

  readonly form = this.formBuilder.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(160)]],
    document: ['', [Validators.required, Validators.maxLength(40)]],
    birthDate: [''],
    email: ['', [Validators.required, Validators.email]],
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

  ngOnInit() {
    this.watchCountrySelection();
    this.charityProgramsService.list().subscribe((response) => this.programs.set(response.items));
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
    this.beneficiariesService.list(this.filters()).subscribe((response) => this.items.set(response.items));
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
      email: item.email ?? '',
      phone: item.phone,
      notes: item.notes ?? '',
      charityProgramId: item.charityProgram.id,
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
  }

  resetForm() {
    this.selected.set(null);
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
    const payload = {
      ...raw,
      birthDate: raw.birthDate || null,
      notes: raw.notes || null,
    };

    if (this.selected()) {
      this.beneficiariesService.update(this.selected()!.id, payload).subscribe(() => {
        this.toastService.show({ type: 'success', text: 'Saved successfully.' });
        this.resetForm();
        this.load();
      });
      return;
    }

    this.beneficiariesService.create(payload).subscribe((response) => {
      this.toastService.show({ type: 'success', text: 'Saved successfully.' });
      this.generatedCredential.set({
        fullName: response.beneficiary.fullName,
        email: response.beneficiary.email ?? payload.email,
        passkey: response.generatedPasskey,
      });
      this.resetFormForNextCreate();
      this.load();
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

  hasError(control: AbstractControl | null, errorCode?: string) {
    if (!control?.invalid || (!control.touched && !control.dirty)) {
      return false;
    }

    return errorCode ? control.hasError(errorCode) : true;
  }

  documentErrorKey() {
    return this.getErrorKey(this.form.controls.document, [
      ['required', 'validation.required'],
      ['cpf', 'validation.invalidCpf'],
    ]);
  }

  phoneErrorKey() {
    return this.getErrorKey(this.form.controls.phone, [
      ['required', 'validation.required'],
      ['brazilianPhone', 'validation.invalidBrazilianPhone'],
    ]);
  }

  emailErrorKey() {
    return this.getErrorKey(this.form.controls.email, [
      ['required', 'validation.required'],
      ['email', 'validation.invalidEmail'],
    ]);
  }

  postalCodeErrorKey() {
    return this.getErrorKey(this.form.controls.address.controls.postalCode, [
      ['required', 'validation.required'],
      ['postalCode', 'validation.invalidPostalCode'],
    ]);
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

  private resetFormForNextCreate() {
    this.selected.set(null);
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
    this.addressLookupMessageKey.set(null);
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

  private getErrorKey(
    control: AbstractControl | null,
    errors: Array<[string, string]>,
  ) {
    if (!this.hasError(control)) {
      return null;
    }

    for (const [errorCode, translationKey] of errors) {
      if (control?.hasError(errorCode)) {
        return translationKey;
      }
    }

    return null;
  }
}
