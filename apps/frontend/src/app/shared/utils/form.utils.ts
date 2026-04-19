import { HttpErrorResponse } from '@angular/common/http';
import type { AbstractControl, FormGroup } from '@angular/forms';
import type { ApiErrorResponse, ApiValidationErrorDetail } from '@solidarity-network/shared';

export function touchAll(control: AbstractControl) {
  control.markAllAsTouched();
  control.updateValueAndValidity();
}

export type ControlErrorMap = ReadonlyArray<readonly [string, string]>;

function getServerValidationTranslationKey(code: string) {
  return `validation.server.${code}`;
}

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

function isValidationDetail(
  detail: unknown,
): detail is ApiValidationErrorDetail {
  return (
    typeof detail === 'object' &&
    detail !== null &&
    'field' in detail &&
    typeof detail.field === 'string' &&
    'message' in detail &&
    typeof detail.message === 'string'
  );
}

function removeServerMessageErrors(control: AbstractControl) {
  const currentErrors = control.errors;

  if (currentErrors?.['serverMessage'] || currentErrors?.['serverMessageKey']) {
    const {
      serverMessage: _serverMessage,
      serverMessageKey: _serverMessageKey,
      ...remainingErrors
    } = currentErrors;
    control.setErrors(Object.keys(remainingErrors).length ? remainingErrors : null);
  }

  const children = (control as FormGroup).controls;
  if (!children) {
    return;
  }

  Object.values(children).forEach((child) => removeServerMessageErrors(child));
}

function revalidateControlTree(control: AbstractControl) {
  const children = (control as FormGroup).controls;

  if (children) {
    Object.values(children).forEach((child) => revalidateControlTree(child));
  }

  control.updateValueAndValidity({ emitEvent: false });
}

export function clearServerValidationErrors(control: AbstractControl) {
  removeServerMessageErrors(control);
}

export function prepareFormForSubmit(control: AbstractControl) {
  clearServerValidationErrors(control);
  revalidateControlTree(control);
}

export function applyServerValidationErrors(
  control: AbstractControl,
  error: unknown,
) {
  if (!(error instanceof HttpErrorResponse)) {
    return false;
  }

  const payload = error.error as ApiErrorResponse | undefined;
  const details = Array.isArray(payload?.details) ? payload.details : [];
  const validationDetails = details.filter(isValidationDetail);

  if (!validationDetails.length) {
    return false;
  }

  validationDetails.forEach((detail) => {
    const targetControl = control.get(detail.field);
    if (!targetControl) {
      return;
    }

    targetControl.setErrors({
      ...(targetControl.errors ?? {}),
      serverMessageKey: detail.code ? getServerValidationTranslationKey(detail.code) : null,
      serverMessage: detail.message,
    });
    targetControl.markAsTouched();
  });

  return true;
}
