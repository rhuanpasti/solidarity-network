import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import type { AbstractControl } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import {
  getControlErrorKey,
  type ControlErrorMap,
} from '../../utils/form.utils';

@Component({
  selector: 'app-form-error',
  standalone: true,
  imports: [TranslateModule],
  template: `
    @if (errorKey(); as key) {
      <small class="field-error" aria-live="polite">{{ key | translate }}</small>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormErrorComponent {
  readonly control = input<AbstractControl | null>(null);
  readonly errors = input<ControlErrorMap>([]);
  readonly fallbackKey = input<string | null>(null);

  readonly errorKey = computed(() =>
    getControlErrorKey(this.control(), this.errors(), this.fallbackKey() ?? undefined),
  );
}
