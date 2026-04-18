import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { EditorPanelComponent } from '../../../shared/components/editor-panel/editor-panel.component';
import { FormSelectComponent, type SelectOption } from '../../../shared/components/form-select/form-select.component';
import { GeneratedCredentialCardComponent } from '../../../shared/components/generated-credential-card/generated-credential-card.component';
import { InputFieldComponent } from '../../../shared/components/input-field/input-field.component';
import { BeneficiaryAddressFieldsComponent } from './beneficiary-address-fields.component';

interface GeneratedCredentialInfo {
  fullName: string;
  email: string;
  passkey: string;
}

@Component({
  selector: 'app-beneficiary-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslateModule,
    ButtonComponent,
    EditorPanelComponent,
    FormSelectComponent,
    GeneratedCredentialCardComponent,
    InputFieldComponent,
    BeneficiaryAddressFieldsComponent,
  ],
  template: `
    <app-editor-panel
      [title]="selected() ? 'features.beneficiaries.editTitle' : 'features.beneficiaries.createTitle'"
      description="features.beneficiaries.formDescription"
      [showReadonlyNote]="isReadOnly()"
    >
      @if (selected() && isReadOnly()) {
        <app-button panelAction type="button" variant="ghost" [disabled]="submitPending()" (click)="edit.emit()">
          <span class="material-symbols-rounded" aria-hidden="true">edit</span>
          {{ 'common.edit' | translate }}
        </app-button>
      }

      @if (generatedCredential(); as credential) {
        <app-generated-credential-card
          eyebrow="features.beneficiaries.generatedPasskeyEyebrow"
          [name]="credential.fullName"
          [email]="credential.email"
          secretLabel="features.beneficiaries.generatedPasskeyLabel"
          [secret]="credential.passkey"
          tone="success"
        />
      }

      <form class="form" [formGroup]="form()" (ngSubmit)="save.emit()">
        <div class="field-grid">
          <app-input-field
            [control]="fullNameControl()"
            label="forms.fullName"
            [errors]="[
              ['required', 'validation.required'],
              ['maxlength', 'validation.maxLength']
            ]"
            [readonly]="isReadOnly()"
          />

          <app-input-field
            [control]="emailControl()"
            label="forms.email"
            type="email"
            [errors]="[
              ['required', 'validation.required'],
              ['email', 'validation.invalidEmail']
            ]"
            [readonly]="isReadOnly()"
          />

          <app-form-select
            [control]="countryControl()"
            label="forms.country"
            [options]="countryOptions()"
            [readonly]="isReadOnly()"
          />
        </div>

        <div class="field-grid">
          <app-input-field
            [control]="documentControl()"
            [label]="documentLabelKey()"
            [errors]="[
              ['required', 'validation.required'],
              ['cpf', 'validation.invalidCpf'],
              ['maxlength', 'validation.maxLength']
            ]"
            [readonly]="isReadOnly()"
          />

          <app-input-field
            [control]="birthDateControl()"
            label="forms.birthDate"
            type="date"
            [errors]="[['required', 'validation.required']]"
            [readonly]="isReadOnly()"
          />
        </div>

        <div class="field-grid">
          <app-input-field
            [control]="phoneControl()"
            label="forms.phone"
            [errors]="[
              ['required', 'validation.required'],
              ['brazilianPhone', 'validation.invalidBrazilianPhone'],
              ['maxlength', 'validation.maxLength']
            ]"
            [readonly]="isReadOnly()"
          />

          <app-form-select
            [control]="charityProgramControl()"
            label="forms.charityProgram"
            [options]="programOptions()"
            placeholder="common.unassigned"
            [readonly]="isReadOnly()"
          />

          <app-form-select
            [control]="statusControl()"
            label="forms.status"
            [options]="statusOptions"
            [readonly]="isReadOnly()"
          />
        </div>

        <app-beneficiary-address-fields
          [group]="addressGroup()"
          [lookupHint]="addressLookupMessageKey()"
          [readonly]="isReadOnly()"
          (postalCodeBlur)="postalCodeBlur.emit()"
        />

        <app-input-field
          [control]="notesControl()"
          label="forms.notes"
          [textarea]="true"
          [readonly]="isReadOnly()"
        />

        <div class="actions">
          @if (!isReadOnly()) {
            <app-button type="submit" variant="primary" [loading]="submitPending()">
              {{ 'common.save' | translate }}
            </app-button>
          }
          <app-button type="button" variant="secondary" [disabled]="submitPending()" (click)="cancel.emit()">
            {{ selected() ? ('common.cancel' | translate) : ('common.clear' | translate) }}
          </app-button>
        </div>
      </form>
    </app-editor-panel>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BeneficiaryFormComponent {
  readonly form = input.required<FormGroup>();
  readonly isReadOnly = input(false);
  readonly submitPending = input(false);
  readonly selected = input<unknown | null>(null);
  readonly generatedCredential = input<GeneratedCredentialInfo | null>(null);
  readonly programOptions = input.required<SelectOption[]>();
  readonly countryOptions = input.required<SelectOption[]>();
  readonly documentLabelKey = input.required<string>();
  readonly addressLookupMessageKey = input<string | null>(null);
  readonly save = output<void>();
  readonly cancel = output<void>();
  readonly edit = output<void>();
  readonly postalCodeBlur = output<void>();
  readonly statusOptions: SelectOption[] = [
    { value: 'active', translationKey: 'enums.beneficiaryStatuses.active' },
    { value: 'inactive', translationKey: 'enums.beneficiaryStatuses.inactive' },
    { value: 'archived', translationKey: 'enums.beneficiaryStatuses.archived' },
  ];

  fullNameControl() {
    return this.form().get('fullName') as FormControl<string>;
  }
  emailControl() {
    return this.form().get('email') as FormControl<string>;
  }
  countryControl() {
    return this.form().get('address.country') as FormControl<string>;
  }
  documentControl() {
    return this.form().get('document') as FormControl<string>;
  }
  birthDateControl() {
    return this.form().get('birthDate') as FormControl<string>;
  }
  phoneControl() {
    return this.form().get('phone') as FormControl<string>;
  }
  charityProgramControl() {
    return this.form().get('charityProgramId') as FormControl<string>;
  }
  statusControl() {
    return this.form().get('status') as FormControl<string>;
  }
  addressGroup() {
    return this.form().get('address') as FormGroup;
  }
  notesControl() {
    return this.form().get('notes') as FormControl<string>;
  }
}
