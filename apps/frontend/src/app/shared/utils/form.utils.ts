import type { AbstractControl } from '@angular/forms';

export function touchAll(control: AbstractControl) {
  control.markAllAsTouched();
  control.updateValueAndValidity();
}

