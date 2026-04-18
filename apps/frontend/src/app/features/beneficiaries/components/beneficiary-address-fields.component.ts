import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { InputFieldComponent } from '../../../shared/components/input-field/input-field.component';

@Component({
  selector: 'app-beneficiary-address-fields',
  standalone: true,
  imports: [ReactiveFormsModule, InputFieldComponent],
  template: `
    <div class="field-grid" [formGroup]="group()">
      <app-input-field
        [control]="postalCodeControl()"
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
        [control]="streetControl()"
        label="forms.street"
        [errors]="[['required', 'validation.required']]"
        [readonly]="readonly()"
      />

      <app-input-field
        [control]="numberControl()"
        label="forms.number"
        [errors]="[['required', 'validation.required']]"
        [readonly]="readonly()"
      />

      <app-input-field
        [control]="districtControl()"
        label="forms.district"
        [errors]="[['required', 'validation.required']]"
        [readonly]="readonly()"
      />

      <app-input-field
        [control]="cityControl()"
        label="forms.city"
        [errors]="[['required', 'validation.required']]"
        [readonly]="readonly()"
      />

      <app-input-field
        [control]="stateControl()"
        label="forms.state"
        [errors]="[['required', 'validation.required']]"
        [readonly]="readonly()"
      />

      <app-input-field
        [control]="complementControl()"
        label="forms.complement"
        [readonly]="readonly()"
      />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BeneficiaryAddressFieldsComponent {
  readonly group = input.required<FormGroup>();
  readonly readonly = input(false);
  readonly lookupHint = input<string | null>(null);
  readonly postalCodeBlur = output<void>();

  postalCodeControl() {
    return this.group().get('postalCode') as FormControl<string>;
  }
  streetControl() {
    return this.group().get('street') as FormControl<string>;
  }
  numberControl() {
    return this.group().get('number') as FormControl<string>;
  }
  districtControl() {
    return this.group().get('district') as FormControl<string>;
  }
  cityControl() {
    return this.group().get('city') as FormControl<string>;
  }
  stateControl() {
    return this.group().get('state') as FormControl<string>;
  }
  complementControl() {
    return this.group().get('complement') as FormControl<string>;
  }
}
