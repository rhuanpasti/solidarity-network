import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { FormControl } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import type { ControlErrorMap } from '../../utils/form.utils';
import { FieldActionDirective } from '../input-field/field-action.directive';
import { InputFieldComponent } from '../input-field/input-field.component';

@Component({
  selector: 'app-password-field',
  standalone: true,
  imports: [TranslateModule, InputFieldComponent, FieldActionDirective],
  template: `
    <app-input-field
      [control]="control()"
      [label]="label()"
      [type]="visible() ? 'text' : 'password'"
      [autocomplete]="autocomplete()"
      [placeholder]="placeholder()"
      [errors]="errors()"
      [externalErrorKey]="externalErrorKey()"
      [externalErrorVisible]="externalErrorVisible()"
      [readonly]="readonly()"
    >
      <button
        appFieldAction
        type="button"
        class="field-action-button"
        [attr.aria-label]="toggleLabel() | translate"
        (click)="toggleVisibility()"
      >
        <span class="material-symbols-rounded">
          {{ visible() ? 'visibility_off' : 'visibility' }}
        </span>
      </button>
    </app-input-field>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordFieldComponent {
  readonly control = input.required<FormControl>();
  readonly label = input.required<string>();
  readonly errors = input<ControlErrorMap>([]);
  readonly autocomplete = input<string | null>(null);
  readonly placeholder = input<string | null>(null);
  readonly externalErrorKey = input<string | null>(null);
  readonly externalErrorVisible = input(false);
  readonly readonly = input(false);
  readonly visible = model(false);
  readonly toggleLabel = computed(() =>
    this.visible() ? 'auth.hidePassword' : 'auth.showPassword',
  );

  toggleVisibility() {
    this.visible.update((current) => !current);
  }
}
