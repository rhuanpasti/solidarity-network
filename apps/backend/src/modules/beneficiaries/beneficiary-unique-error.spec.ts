import { Prisma } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { rethrowBeneficiaryUniqueError } from './beneficiary-unique-error';

function uniqueConstraintError(target: string[]) {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed.', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target },
  });
}

describe('beneficiary unique constraint errors', () => {
  it('maps duplicate email errors to a field-level bad request', () => {
    assert.throws(
      () => rethrowBeneficiaryUniqueError(uniqueConstraintError(['email'])),
      (error: unknown) => {
        assert.ok(error instanceof BadRequestException);
        assert.deepEqual(error.getResponse(), {
          code: 'BENEFICIARY_EMAIL_ALREADY_EXISTS',
          message: 'A beneficiary with this email already exists.',
          details: [
            {
              field: 'email',
              code: 'beneficiaryEmailAlreadyExists',
              message: 'A beneficiary with this email already exists.',
            },
          ],
        });
        return true;
      },
    );
  });

  it('maps duplicate document errors to a field-level bad request', () => {
    assert.throws(
      () => rethrowBeneficiaryUniqueError(uniqueConstraintError(['document'])),
      BadRequestException,
    );
  });
});
