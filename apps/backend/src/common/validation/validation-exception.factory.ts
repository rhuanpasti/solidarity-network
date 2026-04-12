import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

interface ValidationErrorDetail {
  field: string;
  code: string;
  message: string;
}

function buildFieldPath(parentPath: string, property: string) {
  return parentPath ? `${parentPath}.${property}` : property;
}

function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): ValidationErrorDetail[] {
  return errors.flatMap((error) => {
    const field = buildFieldPath(parentPath, error.property);
    const currentErrors = Object.entries(error.constraints ?? {}).map(
      ([code, message]) => ({
        field,
        code,
        message,
      }),
    );

    if (!error.children?.length) {
      return currentErrors;
    }

    return [...currentErrors, ...flattenValidationErrors(error.children, field)];
  });
}

export function createValidationException(errors: ValidationError[]) {
  const details = flattenValidationErrors(errors);

  return new BadRequestException({
    code: 'VALIDATION_ERROR',
    message: 'Submitted data is invalid.',
    details,
  });
}
