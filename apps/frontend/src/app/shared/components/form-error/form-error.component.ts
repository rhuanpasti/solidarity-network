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
    @if (serverErrorTranslationKey(); as translationKey) {
      <small class="field-error" aria-live="polite">{{ translationKey | translate }}</small>
    } @else if (serverErrorMessage(); as message) {
      <small class="field-error" aria-live="polite">{{ message }}</small>
    } @else if (errorKey(); as key) {
      <small class="field-error" aria-live="polite">{{ key | translate }}</small>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormErrorComponent {
  readonly control = input<AbstractControl | null>(null);
  readonly errors = input<ControlErrorMap>([]);
  readonly fallbackKey = input<string | null>(null);
  readonly serverErrorMessage = computed(() => {
    const serverMessage = this.control()?.getError('serverMessage');
    return typeof serverMessage === 'string' ? serverMessage : null;
  });
  readonly serverErrorTranslationKey = computed(() => {
    const serverMessageKey = this.control()?.getError('serverMessageKey');
    return typeof serverMessageKey === 'string' ? serverMessageKey : null;
  });

  readonly errorKey = computed(() =>
    getControlErrorKey(this.control(), this.errors(), this.fallbackKey() ?? undefined),
  );
}
