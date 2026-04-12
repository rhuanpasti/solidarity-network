import type { AbstractControl } from '@angular/forms';

export function touchAll(control: AbstractControl) {
  control.markAllAsTouched();
  control.updateValueAndValidity();
}

export type ControlErrorMap = ReadonlyArray<readonly [string, string]>;

export function shouldShowControlError(control: AbstractControl | null) {
  return !!control && control.invalid && (control.touched || control.dirty);
}

export function getControlErrorKey(
  control: AbstractControl | null,
  errors: ControlErrorMap,
  fallbackKey?: string,
) {
  if (!shouldShowControlError(control)) {
    return null;
  }

  for (const [errorCode, translationKey] of errors) {
    if (control?.hasError(errorCode)) {
      return translationKey;
    }
  }

  return fallbackKey ?? null;
}
