import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  input,
  output,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import {
  getControlErrorKey,
  shouldShowControlError,
  type ControlErrorMap,
} from '../../utils/form.utils';
import { FieldActionDirective } from './field-action.directive';

let nextInputFieldId = 0;

@Component({
  selector: 'app-input-field',
  standalone: true,
  imports: [ReactiveFormsModule, TranslateModule],
  template: `
    <label class="field" [attr.for]="inputId()">
      <span class="field-label">
        {{ label() | translate }}
        @if (isRequired()) {
          <span class="field-required" aria-hidden="true">*</span>
        }
      </span>

      @if (textarea()) {
        <textarea
          class="input textarea"
          [class.input-invalid]="showError()"
          [formControl]="control()"
          [id]="inputId()"
          [rows]="rows()"
          [attr.aria-describedby]="describedBy()"
          [attr.aria-invalid]="showError()"
          [attr.autocomplete]="autocomplete()"
          [attr.inputmode]="inputMode()"
          [attr.max]="max()"
          [attr.min]="min()"
          [attr.placeholder]="placeholder() ? (placeholder()! | translate) : null"
          [attr.readonly]="readonly() ? true : null"
          (blur)="handleBlur($event)"
        ></textarea>
      } @else {
        <div class="field-control" [class.has-action]="hasAction()">
          <input
            class="input"
            [class.input-invalid]="showError()"
            [formControl]="control()"
            [id]="inputId()"
            [type]="type()"
            [attr.aria-describedby]="describedBy()"
            [attr.aria-invalid]="showError()"
            [attr.autocomplete]="autocomplete()"
            [attr.inputmode]="inputMode()"
            [attr.max]="max()"
            [attr.min]="min()"
            [attr.placeholder]="placeholder() ? (placeholder()! | translate) : null"
            [attr.readonly]="readonly() ? true : null"
            [attr.step]="step()"
            (blur)="handleBlur($event)"
          />
          @if (hasAction()) {
            <span class="field-action-slot">
              <ng-content select="[appFieldAction]" />
            </span>
          }
        </div>
      }

      @if (serverErrorTranslationKey(); as translationKey) {
        <small class="field-error" [id]="errorId()" aria-live="polite">
          {{ translationKey | translate }}
        </small>
      } @else if (serverErrorMessage(); as message) {
        <small class="field-error" [id]="errorId()" aria-live="polite">
          {{ message }}
        </small>
      } @else if (errorKey(); as key) {
        <small class="field-error" [id]="errorId()" aria-live="polite">
          {{ key | translate }}
        </small>
      } @else if (hint(); as hintKey) {
        <small class="field-hint" [id]="hintId()">
          {{ hintKey | translate }}
        </small>
      }
    </label>
  `,
  styleUrl: './input-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputFieldComponent {
  readonly control = input.required<FormControl>();
  readonly label = input.required<string>();
  readonly errors = input<ControlErrorMap>([]);
  readonly fallbackErrorKey = input<string | null>(null);
  readonly externalErrorKey = input<string | null>(null);
  readonly externalErrorVisible = input(false);
  readonly type = input('text');
  readonly autocomplete = input<string | null>(null);
  readonly inputMode = input<string | null>(null);
  readonly placeholder = input<string | null>(null);
  readonly hint = input<string | null>(null);
  readonly id = input<string | null>(null);
  readonly textarea = input(false);
  readonly rows = input(4);
  readonly min = input<string | number | null>(null);
  readonly max = input<string | number | null>(null);
  readonly step = input<string | number | null>(null);
  readonly readonly = input(false);
  readonly blurred = output<FocusEvent>();

  private readonly projectedAction = contentChild(FieldActionDirective);
  private readonly generatedId = `input-field-${++nextInputFieldId}`;

  readonly inputId = computed(() => this.id() ?? this.generatedId);
  readonly errorId = computed(() => `${this.inputId()}-error`);
  readonly hintId = computed(() => `${this.inputId()}-hint`);
  readonly hasAction = computed(() => !!this.projectedAction());
  readonly serverErrorMessage = computed(() => {
    const control = this.control();
    const serverMessage = control?.getError('serverMessage');
    return typeof serverMessage === 'string' ? serverMessage : null;
  });
  readonly serverErrorTranslationKey = computed(() => {
    const control = this.control();
    const serverMessageKey = control?.getError('serverMessageKey');
    return typeof serverMessageKey === 'string' ? serverMessageKey : null;
  });
  readonly isRequired = computed(() => {
    const control = this.control();

    return (
      !!control &&
      (control.hasValidator(Validators.required) || control.hasValidator(Validators.requiredTrue))
    );
  });
  readonly errorKey = computed(() => {
    const controlErrorKey = getControlErrorKey(
      this.control(),
      this.errors(),
      this.fallbackErrorKey() ?? undefined,
    );

    if (controlErrorKey) {
      return controlErrorKey;
    }

    return this.externalErrorVisible() ? this.externalErrorKey() : null;
  });
  readonly showError = computed(
    () =>
      shouldShowControlError(this.control()) ||
      !!(this.externalErrorVisible() && this.externalErrorKey()),
  );
  readonly describedBy = computed(() => {
    if (this.serverErrorTranslationKey() || this.serverErrorMessage() || this.errorKey()) {
      return this.errorId();
    }

    return this.hint() ? this.hintId() : null;
  });

  handleBlur(event: FocusEvent) {
    this.blurred.emit(event);
  }
}
