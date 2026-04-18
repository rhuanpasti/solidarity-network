import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import {
  getControlErrorKey,
  shouldShowControlError,
  type ControlErrorMap,
} from '../../utils/form.utils';
import { FormErrorComponent } from '../form-error/form-error.component';

export interface SelectOption {
  value: string;
  label?: string;
  translationKey?: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-form-select',
  standalone: true,
  imports: [ReactiveFormsModule, TranslateModule, FormErrorComponent],
  template: `
    <label class="field">
      <span class="field-label">
        {{ label() | translate }}
        @if (isRequired()) {
          <span class="field-required" aria-hidden="true">*</span>
        }
      </span>

      <select
        class="input"
        [class.input-invalid]="showError()"
        [formControl]="control()"
        [attr.aria-invalid]="showError()"
        [multiple]="multiple()"
        [disabled]="readonly()"
      >
        @if (placeholder(); as placeholderKey) {
          <option value="">{{ placeholderKey | translate }}</option>
        }

        @for (option of options(); track option.value) {
          <option [value]="option.value" [disabled]="option.disabled">
            @if (option.translationKey) {
              {{ option.translationKey | translate }}
            } @else {
              {{ option.label }}
            }
          </option>
        }
      </select>

      <app-form-error [control]="control()" [errors]="errors()" [fallbackKey]="fallbackErrorKey()" />
    </label>
  `,
  styleUrl: '../input-field/input-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormSelectComponent {
  readonly control = input.required<FormControl>();
  readonly label = input.required<string>();
  readonly options = input<SelectOption[]>([]);
  readonly errors = input<ControlErrorMap>([]);
  readonly fallbackErrorKey = input<string | null>(null);
  readonly placeholder = input<string | null>(null);
  readonly multiple = input(false);
  readonly readonly = input(false);

  readonly isRequired = computed(() => {
    const control = this.control();
    return (
      control.hasValidator(Validators.required) ||
      control.hasValidator(Validators.requiredTrue)
    );
  });
  readonly showError = computed(() => shouldShowControlError(this.control()));
  readonly errorKey = computed(() =>
    getControlErrorKey(this.control(), this.errors(), this.fallbackErrorKey() ?? undefined),
  );
}
