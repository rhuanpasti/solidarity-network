import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { EditorPanelComponent } from '../../../shared/components/editor-panel/editor-panel.component';
import { FormSelectComponent, type SelectOption } from '../../../shared/components/form-select/form-select.component';
import { GeneratedCredentialCardComponent } from '../../../shared/components/generated-credential-card/generated-credential-card.component';
import { InputFieldComponent } from '../../../shared/components/input-field/input-field.component';
import type { BeneficiaryForm } from '../beneficiaries.state';
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
            [control]="form().controls.fullName"
            label="forms.fullName"
            [errors]="[
              ['required', 'validation.required'],
              ['maxlength', 'validation.maxLength']
            ]"
            [readonly]="isReadOnly()"
          />

          <app-input-field
            [control]="form().controls.email"
            label="forms.email"
            type="email"
            [errors]="[
              ['required', 'validation.required'],
              ['email', 'validation.invalidEmail']
            ]"
            [readonly]="isReadOnly()"
          />

          <app-form-select
            [control]="form().controls.address.controls.country"
            label="forms.country"
            [options]="countryOptions()"
            [readonly]="isReadOnly()"
          />
        </div>

        <div class="field-grid">
          <app-input-field
            [control]="form().controls.document"
            [label]="documentLabelKey()"
            [errors]="[
              ['required', 'validation.required'],
              ['cpf', 'validation.invalidCpf'],
              ['maxlength', 'validation.maxLength']
            ]"
            [readonly]="isReadOnly()"
          />

          <app-input-field
            [control]="form().controls.birthDate"
            label="forms.birthDate"
            type="date"
            [errors]="[['required', 'validation.required']]"
            [readonly]="isReadOnly()"
          />
        </div>

        <div class="field-grid">
          <app-input-field
            [control]="form().controls.phone"
            label="forms.phone"
            [errors]="[
              ['required', 'validation.required'],
              ['brazilianPhone', 'validation.invalidBrazilianPhone'],
              ['maxlength', 'validation.maxLength']
            ]"
            [readonly]="isReadOnly()"
          />

          <app-form-select
            [control]="form().controls.charityProgramIds"
            label="forms.charityPrograms"
            [options]="programOptions()"
            [multiple]="true"
            [readonly]="isReadOnly()"
          />

          <app-form-select
            [control]="form().controls.status"
            label="forms.status"
            [options]="statusOptions"
            [readonly]="isReadOnly()"
          />
        </div>

        <app-beneficiary-address-fields
          [group]="form().controls.address"
          [lookupHint]="addressLookupMessageKey()"
          [readonly]="isReadOnly()"
          (postalCodeBlur)="postalCodeBlur.emit()"
        />

        <app-input-field
          [control]="form().controls.notes"
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
  readonly form = input.required<BeneficiaryForm>();
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
}
