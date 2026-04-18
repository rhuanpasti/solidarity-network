import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-checkbox-field',
  standalone: true,
  imports: [ReactiveFormsModule, TranslateModule],
  template: `
    <label class="field checkbox-field">
      <span>{{ label() | translate }}</span>
      <input type="checkbox" [formControl]="control()" [disabled]="readonly()" />
    </label>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckboxFieldComponent {
  readonly control = input.required<FormControl>();
  readonly label = input.required<string>();
  readonly readonly = input(false);
}
