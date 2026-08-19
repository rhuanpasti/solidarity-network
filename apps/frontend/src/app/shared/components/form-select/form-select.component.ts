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
      [option.label, option.translationKey, option.value]
        .filter((text): text is string => !!text)
        .join(' ')
        .toLocaleLowerCase()
        .includes(normalizedSearch),
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
        <div class="searchable-select" [class.input-invalid]="showError()">
          <input
            class="input select-search"
            type="search"
            [value]="searchInputValue()"
            [placeholder]="searchPlaceholder() | translate"
            [attr.aria-label]="searchPlaceholder() | translate"
            [attr.aria-labelledby]="fieldLabelId"
            role="combobox"
            [attr.aria-controls]="optionsListId"
            [attr.aria-expanded]="optionsOpen()"
            [attr.aria-autocomplete]="'list'"
            [disabled]="readonly()"
            (focus)="openOptions($event)"
            (input)="updateOptionSearch($event)"
            (blur)="closeOptionsSoon()"
            (keydown.escape)="closeOptions()"
          />

          @if (multiple() && selectedOptions().length) {
            <button
              type="button"
              class="selected-summary"
              [disabled]="readonly()"
              (click)="openSelectedOptions()"
              (keydown.escape)="closeSelectedOptions()"
            >
              {{ 'common.selectedCount' | translate: { count: selectedOptions().length } }}
            </button>
          }

          @if (optionsOpen()) {
            <div
              class="select-options"
              [id]="optionsListId"
              role="listbox"
              [attr.aria-labelledby]="fieldLabelId"
              [attr.aria-multiselectable]="multiple()"
            >
              @for (option of filteredOptions(); track option.value) {
                <button
                  type="button"
                  class="select-option"
                  [class.selected]="isSelected(option)"
                  [attr.aria-selected]="isSelected(option)"
                  [disabled]="option.disabled"
                  (mousedown)="$event.preventDefault()"
                  (click)="selectOption(option)"
                >
                  <span>
                    @if (option.translationKey) {
                      {{ option.translationKey | translate }}
                    } @else {
                      {{ option.label || option.value }}
                    }
                  </span>
                  @if (isSelected(option)) {
                    <span class="material-symbols-rounded" aria-hidden="true">check</span>
                  }
                </button>
              } @empty {
                <span class="select-empty">{{ 'common.noOptionsFound' | translate }}</span>
              }
            </div>
          }
        </div>

        @if (selectedOptionsOpen()) {
          <div class="selected-options-dialog-backdrop">
            <section
              class="selected-options-dialog"
              role="dialog"
              aria-modal="true"
              [attr.aria-labelledby]="selectedOptionsTitleId"
              tabindex="-1"
              (keydown.escape)="closeSelectedOptions()"
            >
              <header class="selected-options-dialog-header">
                <h3 [id]="selectedOptionsTitleId">
                  {{ label() | translate }}
                </h3>
                <button
                  type="button"
                  class="selected-options-dialog-close"
                  [attr.aria-label]="'common.close' | translate"
                  (click)="closeSelectedOptions()"
                >
                  <span class="material-symbols-rounded" aria-hidden="true">close</span>
                </button>
              </header>

              <div class="selected-options-dialog-list">
                @for (option of selectedOptions(); track option.value) {
                  <div class="selected-dialog-option">
                    <span>
                      @if (option.translationKey) {
                        {{ option.translationKey | translate }}
                      } @else {
                        {{ option.label || option.value }}
                      }
                    </span>
                    <button
                      type="button"
                      class="selected-dialog-option-remove"
                      [attr.aria-label]="'common.remove' | translate"
                      [disabled]="readonly()"
                      (click)="removeOption(option)"
                    >
                      <span aria-hidden="true">×</span>
                    </button>
                  </div>
                }
              </div>
            </section>
          </div>
        }
      } @else if (multiple()) {
        <select
          class="input"
          [class.input-invalid]="showError()"
          [formControl]="control()"
          [attr.aria-invalid]="showError()"
          [attr.aria-labelledby]="fieldLabelId"
          multiple
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
  styleUrls: ['../input-field/input-field.component.scss', './form-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormSelectComponent {
  readonly fieldLabelId = `form-select-label-${nextFormSelectLabelId++}`;
  readonly optionsListId = `${this.fieldLabelId}-options`;
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
  readonly optionsOpen = signal(false);
  readonly selectedOptionsOpen = signal(false);
  readonly selectedOptionsTitleId = `${this.fieldLabelId}-selected-title`;
  filteredOptions() {
    const value = this.control().value;
    const selectedValues = this.multiple()
      ? Array.isArray(value)
        ? value
        : value
          ? [value]
        : []
      : [];
    return filterSelectOptions(this.options(), this.optionSearch(), selectedValues);
  }

  selectedOptions() {
    const value = this.control().value;
    const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
    const selected = new Set(selectedValues);
    return this.options().filter((option) => selected.has(option.value));
  }

  searchInputValue() {
    if (this.multiple() || this.optionSearch()) {
      return this.optionSearch();
    }

    const selected = this.selectedOptions()[0];
    return selected?.label ?? '';
  }

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
    this.optionsOpen.set(true);
  }

  openOptions(event: FocusEvent) {
    this.optionsOpen.set(true);

    if (!this.multiple() && !this.optionSearch()) {
      (event.target as HTMLInputElement).select();
    }
  }

  closeOptionsSoon() {
    setTimeout(() => this.optionsOpen.set(false));
  }

  closeOptions() {
    this.optionsOpen.set(false);
  }

  openSelectedOptions() {
    this.optionsOpen.set(false);
    this.selectedOptionsOpen.set(true);
  }

  closeSelectedOptions() {
    this.selectedOptionsOpen.set(false);
  }

  isSelected(option: SelectOption) {
    const value = this.control().value;
    return Array.isArray(value) ? value.includes(option.value) : value === option.value;
  }

  selectOption(option: SelectOption) {
    if (option.disabled || this.readonly()) {
      return;
    }

    if (this.multiple()) {
      const current: string[] = Array.isArray(this.control().value)
        ? this.control().value as string[]
        : [];
      const next = current.includes(option.value)
        ? current.filter((value: string) => value !== option.value)
        : [...current, option.value];
      this.control().setValue(next);
      this.optionsOpen.set(true);
    } else {
      this.control().setValue(option.value);
      this.optionsOpen.set(false);
    }

    this.control().markAsDirty();
    this.control().markAsTouched();
    this.optionSearch.set('');
  }

  removeOption(option: SelectOption) {
    if (this.readonly() || !Array.isArray(this.control().value)) {
      return;
    }

    const current = this.control().value as string[];
    this.control().setValue(current.filter((value: string) => value !== option.value));
    this.control().markAsDirty();
    this.control().markAsTouched();
  }
}
