import type { HttpErrorResponse } from '@angular/common/http';
import type { ApiErrorResponse } from '@solidarity-network/shared';
import type { ToastMessage } from '../services/toast.service';

const validationErrorCodes: readonly string[] = [
  'VALIDATION_ERROR',
  'INVALID_BENEFICIARY_DATA',
  'BENEFICIARY_DOCUMENT_ALREADY_EXISTS',
  'BENEFICIARY_EMAIL_ALREADY_EXISTS',
];

const postalCodeLookupErrorCodes: readonly string[] = [
  'POSTAL_CODE_NOT_FOUND',
  'POSTAL_CODE_LOOKUP_FAILED',
];

function isNotFoundCode(code?: string) {
  return !!code && code.endsWith('_NOT_FOUND');
}

export function getApiErrorToast(
  error: HttpErrorResponse,
  payload?: ApiErrorResponse,
): ToastMessage {
  const code = payload?.code;

  if (code && validationErrorCodes.includes(code)) {
    return {
      type: 'error',
      translationKey: 'validation.reviewHighlightedFields',
    };
  }

  if (code === 'BENEFIT_INACTIVE') {
    return {
      type: 'error',
      translationKey: 'errors.benefitInactive',
    };
  }

  if (code === 'BENEFICIARY_PROGRAM_MISMATCH') {
    return {
      type: 'error',
      translationKey: 'errors.beneficiaryProgramMismatch',
    };
  }

  if (code === 'ADMINISTRATOR_NOT_ASSIGNED') {
    return {
      type: 'error',
      translationKey: 'errors.administratorNotAssigned',
    };
  }

  if (code === 'ROOT_ADMIN_IMMUTABLE') {
    return {
      type: 'error',
      translationKey: 'errors.rootAdministratorImmutable',
    };
  }

  if (code === 'INVALID_POSTAL_CODE') {
    return {
      type: 'error',
      translationKey: 'validation.invalidPostalCode',
    };
  }

  if (code && postalCodeLookupErrorCodes.includes(code)) {
    return {
      type: 'error',
      translationKey: 'validation.postalCodeLookupFailed',
    };
  }

  if (isNotFoundCode(code)) {
    return {
      type: 'error',
      translationKey: 'errors.relatedRecordUnavailable',
    };
  }

  if (error.status >= 500) {
    return {
      type: 'error',
      translationKey: 'errors.unexpected',
    };
  }

  if (payload?.message) {
    return {
      type: 'error',
      text: payload.message,
    };
  }

  return {
    type: 'error',
    translationKey: 'errors.requestFailed',
  };
}
