import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonComponent } from '../../../shared/components/button/button.component';
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
    FormSelectComponent,
    GeneratedCredentialCardComponent,
    InputFieldComponent,
    BeneficiaryAddressFieldsComponent,
  ],
  template: `
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

      <form class="form" [formGroup]="form()" (ngSubmit)="saveRequested.emit()">
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
            [mask]="isBrazilDocument() ? 'cpf' : null"
            [inputMode]="isBrazilDocument() ? 'numeric' : null"
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
            [searchable]="true"
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

        <section class="dependents" aria-labelledby="beneficiary-dependents-title">
          <div class="dependents-header">
            <div>
              <h3 id="beneficiary-dependents-title">
                {{ 'features.beneficiaries.dependentsTitle' | translate }}
              </h3>
              <p>{{ 'features.beneficiaries.dependentsDescription' | translate }}</p>
            </div>

            @if (!isReadOnly()) {
              <app-button type="button" variant="secondary" [disabled]="submitPending()" (click)="addDependent.emit()">
                <span class="material-symbols-rounded" aria-hidden="true">add</span>
                {{ 'features.beneficiaries.addDependent' | translate }}
              </app-button>
            }
          </div>

          @if (form().controls.dependents.controls.length) {
            <div class="dependent-list" formArrayName="dependents">
              @for (dependentGroup of form().controls.dependents.controls; track $index; let index = $index) {
                <fieldset class="dependent-row" [formGroupName]="index">
                  <div class="dependent-row-header">
                    <legend>
                      {{ 'features.beneficiaries.dependentLabel' | translate: { number: index + 1 } }}
                    </legend>

                    @if (!isReadOnly()) {
                      <app-button
                        type="button"
                        variant="ghost"
                        [disabled]="submitPending()"
                        (click)="removeDependent.emit(index)"
                      >
                        <span class="material-symbols-rounded" aria-hidden="true">delete</span>
                        {{ 'features.beneficiaries.removeDependent' | translate }}
                      </app-button>
                    }
                  </div>

                  <div class="field-grid">
                    <app-input-field
                      [control]="dependentGroup.controls.fullName"
                      label="forms.fullName"
                      [errors]="[
                        ['required', 'validation.required'],
                        ['maxlength', 'validation.maxLength']
                      ]"
                      [readonly]="isReadOnly()"
                    />

                    <app-form-select
                      [control]="dependentGroup.controls.relationship"
                      label="forms.relationship"
                      [options]="dependentRelationshipOptions()"
                      [readonly]="isReadOnly()"
                    />
                  </div>

                  <div class="field-grid">
                    <app-input-field
                      [control]="dependentGroup.controls.birthDate"
                      label="forms.birthDate"
                      type="date"
                      [errors]="[
                        ['required', 'validation.required'],
                        ['dependentUnder18', 'validation.dependentUnder18']
                      ]"
                      [readonly]="isReadOnly()"
                    />

                    <app-input-field
                      [control]="dependentGroup.controls.document"
                      label="forms.document"
                      [mask]="isBrazilDocument() ? 'cpf' : null"
                      [inputMode]="isBrazilDocument() ? 'numeric' : null"
                      [errors]="[['maxlength', 'validation.maxLength']]"
                      [readonly]="isReadOnly()"
                    />
                  </div>
                </fieldset>
              }
            </div>
          }
        </section>

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
          <app-button type="button" variant="secondary" [disabled]="submitPending()" (click)="cancelRequested.emit()">
            {{ selected() ? ('common.cancel' | translate) : ('common.clear' | translate) }}
          </app-button>
        </div>
      </form>
  `,
  styleUrl: './beneficiary-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BeneficiaryFormComponent {
  readonly form = input.required<BeneficiaryForm>();
  readonly isReadOnly = input(false);
  readonly submitPending = input(false);
  readonly selected = input<unknown | null>(null);
  readonly generatedCredential = input<GeneratedCredentialInfo | null>(null);
  readonly programOptions = input.required<SelectOption[]>();
  readonly dependentRelationshipOptions = input.required<SelectOption[]>();
  readonly countryOptions = input.required<SelectOption[]>();
  readonly documentLabelKey = input.required<string>();
  readonly isBrazilDocument = input(false);
  readonly addressLookupMessageKey = input<string | null>(null);
  readonly saveRequested = output<void>();
  readonly cancelRequested = output<void>();
  readonly addDependent = output<void>();
  readonly removeDependent = output<number>();
  readonly postalCodeBlur = output<void>();
  readonly statusOptions: SelectOption[] = [
    { value: 'active', translationKey: 'enums.beneficiaryStatuses.active' },
    { value: 'inactive', translationKey: 'enums.beneficiaryStatuses.inactive' },
    { value: 'archived', translationKey: 'enums.beneficiaryStatuses.archived' },
  ];
}
