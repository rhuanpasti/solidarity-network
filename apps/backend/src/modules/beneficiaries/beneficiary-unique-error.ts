import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export function rethrowBeneficiaryUniqueError(error: unknown): never | void {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== 'P2002' ||
    !Array.isArray(error.meta?.target)
  ) {
    return;
  }

  const target = error.meta.target;

  if (target.includes('document')) {
    throw new BadRequestException({
      code: 'BENEFICIARY_DOCUMENT_ALREADY_EXISTS',
      message: 'A beneficiary with this document already exists.',
      details: [
        {
          field: 'document',
          code: 'beneficiaryDocumentAlreadyExists',
          message: 'A beneficiary with this document already exists.',
        },
      ],
    });
  }

  if (target.includes('email')) {
    throw new BadRequestException({
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
  }
}
