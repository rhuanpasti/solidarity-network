import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import type { BeneficiaryAddressForm } from '../beneficiaries.state';
import { InputFieldComponent } from '../../../shared/components/input-field/input-field.component';

@Component({
  selector: 'app-beneficiary-address-fields',
  standalone: true,
  imports: [ReactiveFormsModule, InputFieldComponent],
  template: `
    <div class="field-grid" [formGroup]="group()">
      <app-input-field
        [control]="group().controls.postalCode"
        label="forms.postalCode"
        [errors]="[
          ['required', 'validation.required'],
          ['postalCode', 'validation.invalidPostalCode']
        ]"
        [hint]="lookupHint()"
        (blurred)="postalCodeBlur.emit()"
        [readonly]="readonly()"
      />

      <app-input-field
        [control]="group().controls.street"
        label="forms.street"
        [errors]="[['required', 'validation.required']]"
        [readonly]="readonly()"
      />

      <app-input-field
        [control]="group().controls.number"
        label="forms.number"
        [errors]="[['required', 'validation.required']]"
        [readonly]="readonly()"
      />

      <app-input-field
        [control]="group().controls.district"
        label="forms.district"
        [errors]="[['required', 'validation.required']]"
        [readonly]="readonly()"
      />

      <app-input-field
        [control]="group().controls.city"
        label="forms.city"
        [errors]="[['required', 'validation.required']]"
        [readonly]="readonly()"
      />

      <app-input-field
        [control]="group().controls.state"
        label="forms.state"
        [errors]="[['required', 'validation.required']]"
        [readonly]="readonly()"
      />

      <app-input-field
        [control]="group().controls.complement"
        label="forms.complement"
        [readonly]="readonly()"
      />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BeneficiaryAddressFieldsComponent {
  readonly group = input.required<BeneficiaryAddressForm>();
  readonly readonly = input(false);
  readonly lookupHint = input<string | null>(null);
  readonly postalCodeBlur = output<void>();
}
