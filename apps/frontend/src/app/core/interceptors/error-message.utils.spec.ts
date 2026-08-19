import { HttpErrorResponse } from '@angular/common/http';
import type { ApiErrorResponse } from '@solidarity-network/shared';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getApiErrorToast } from './error-message.utils';

describe('getApiErrorToast', () => {
  it('highlights form fields for validation-related error codes', () => {
    const error = new HttpErrorResponse({ status: 400 });
    const validationErrorCodes = [
      'VALIDATION_ERROR',
      'INVALID_BENEFICIARY_DATA',
      'BENEFICIARY_DOCUMENT_ALREADY_EXISTS',
      'BENEFICIARY_EMAIL_ALREADY_EXISTS',
    ];

    for (const code of validationErrorCodes) {
      assert.deepEqual(
        getApiErrorToast(error, { code } as ApiErrorResponse),
        {
          type: 'error',
          translationKey: 'validation.reviewHighlightedFields',
        },
      );
    }
  });
});
