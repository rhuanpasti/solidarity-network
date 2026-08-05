import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import {
  getControlErrorKey,
  shouldShowControlError,
  type ControlErrorMap,
} from '../../utils/form.utils';
import { FormErrorComponent } from '../form-error/form-error.component';

let nextFormSelectLabelId = 0;

export interface SelectOption {
  value: string;
  label?: string;
  translationKey?: string;
  disabled?: boolean;
}

export function filterSelectOptions(
  options: SelectOption[],
  search: string,
  selectedValues: string[] = [],
) {
  const normalizedSearch = search.trim().toLocaleLowerCase();

  if (!normalizedSearch) {
    return options;
  }

  const selected = new Set(selectedValues);
  return options.filter(
    (option) =>
      selected.has(option.value) ||
      option.label?.toLocaleLowerCase().includes(normalizedSearch),
  );
}

@Component({
  selector: 'app-form-select',
  standalone: true,
  imports: [ReactiveFormsModule, TranslateModule, FormErrorComponent],
  template: `
    <div class="field">
      <span class="field-label" [id]="fieldLabelId">
        {{ label() | translate }}
        @if (isRequired()) {
          <span class="field-required" aria-hidden="true">*</span>
        }
      </span>

      @if (searchable()) {
        <input
          class="input select-search"
          type="search"
          [value]="optionSearch()"
          [placeholder]="searchPlaceholder() | translate"
          [attr.aria-label]="searchPlaceholder() | translate"
          [attr.aria-labelledby]="fieldLabelId"
          (input)="updateOptionSearch($event)"
        />
      }

      @if (multiple()) {
        <select
          class="input"
          [class.input-invalid]="showError()"
          [formControl]="control()"
          [attr.aria-invalid]="showError()"
          [attr.aria-labelledby]="fieldLabelId"
          multiple
          [disabled]="readonly()"
        >
          @for (option of filteredOptions(); track option.value) {
            <option [value]="option.value" [disabled]="option.disabled">
              @if (option.translationKey) {
                {{ option.translationKey | translate }}
              } @else {
                {{ option.label }}
              }
            </option>
          }
        </select>
      } @else {
        <select
          class="input"
          [class.input-invalid]="showError()"
          [formControl]="control()"
          [attr.aria-invalid]="showError()"
          [attr.aria-labelledby]="fieldLabelId"
          [disabled]="readonly()"
        >
          @if (placeholder(); as placeholderKey) {
            <option value="">{{ placeholderKey | translate }}</option>
          }

          @for (option of filteredOptions(); track option.value) {
            <option [value]="option.value" [disabled]="option.disabled">
              @if (option.translationKey) {
                {{ option.translationKey | translate }}
              } @else {
                {{ option.label }}
              }
            </option>
          }
        </select>
      }

      <app-form-error [control]="control()" [errors]="errors()" [fallbackKey]="fallbackErrorKey()" />
    </div>
  `,
  styleUrl: '../input-field/input-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormSelectComponent {
  readonly fieldLabelId = `form-select-label-${nextFormSelectLabelId++}`;
  readonly control = input.required<FormControl>();
  readonly label = input.required<string>();
  readonly options = input<SelectOption[]>([]);
  readonly errors = input<ControlErrorMap>([]);
  readonly fallbackErrorKey = input<string | null>(null);
  readonly placeholder = input<string | null>(null);
  readonly multiple = input(false);
  readonly readonly = input(false);
  readonly searchable = input(false);
  readonly searchPlaceholder = input('common.searchProgramsPlaceholder');
  readonly optionSearch = signal('');
  readonly filteredOptions = computed(() => {
    const value = this.control().value;
    const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
    return filterSelectOptions(this.options(), this.optionSearch(), selectedValues);
  });

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

  updateOptionSearch(event: Event) {
    this.optionSearch.set((event.target as HTMLInputElement).value);
  }
}
