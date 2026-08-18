import type { HttpErrorResponse } from '@angular/common/http';
import type { ApiErrorResponse } from '@solidarity-network/shared';
import type { ToastMessage } from '../services/toast.service';

function isNotFoundCode(code?: string) {
  return !!code && code.endsWith('_NOT_FOUND');
}

export function getApiErrorToast(
  error: HttpErrorResponse,
  payload?: ApiErrorResponse,
): ToastMessage {
  if (
    payload?.code === 'VALIDATION_ERROR' ||
    payload?.code === 'INVALID_BENEFICIARY_DATA' ||
    payload?.code === 'BENEFICIARY_DOCUMENT_ALREADY_EXISTS' ||
    payload?.code === 'BENEFICIARY_EMAIL_ALREADY_EXISTS'
  ) {
    return {
      type: 'error',
      translationKey: 'validation.reviewHighlightedFields',
    };
  }

  if (payload?.code === 'BENEFIT_INACTIVE') {
    return {
      type: 'error',
      translationKey: 'errors.benefitInactive',
    };
  }

  if (payload?.code === 'BENEFICIARY_PROGRAM_MISMATCH') {
    return {
      type: 'error',
      translationKey: 'errors.beneficiaryProgramMismatch',
    };
  }

  if (payload?.code === 'ADMINISTRATOR_NOT_ASSIGNED') {
    return {
      type: 'error',
      translationKey: 'errors.administratorNotAssigned',
    };
  }

  if (payload?.code === 'ROOT_ADMIN_IMMUTABLE') {
    return {
      type: 'error',
      translationKey: 'errors.rootAdministratorImmutable',
    };
  }

  if (payload?.code === 'INVALID_POSTAL_CODE') {
    return {
      type: 'error',
      translationKey: 'validation.invalidPostalCode',
    };
  }

  if (payload?.code === 'POSTAL_CODE_NOT_FOUND' || payload?.code === 'POSTAL_CODE_LOOKUP_FAILED') {
    return {
      type: 'error',
      translationKey: 'validation.postalCodeLookupFailed',
    };
  }

  if (isNotFoundCode(payload?.code)) {
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
