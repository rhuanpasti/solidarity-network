import type { Beneficiary, CharityProgram, Prisma } from '@prisma/client';
import type { Address, BeneficiarySummary } from '@solidarity-network/shared';
import { toCharityProgramSummary } from '../charity-programs/charity-programs.mapper';

type BeneficiaryWithProgram = Beneficiary & {
  charityProgram: CharityProgram | null;
  address: Prisma.JsonValue;
};

export function toBeneficiarySummary(
  beneficiary: BeneficiaryWithProgram,
): BeneficiarySummary {
  return {
    id: beneficiary.id,
    fullName: beneficiary.fullName,
    document: beneficiary.document,
    birthDate: beneficiary.birthDate?.toISOString() ?? null,
    email: beneficiary.email,
    phone: beneficiary.phone,
    address: beneficiary.address as unknown as Address,
    notes: beneficiary.notes,
    charityProgram: beneficiary.charityProgram
      ? toCharityProgramSummary(beneficiary.charityProgram)
      : null,
    createdAt: beneficiary.createdAt.toISOString(),
    status: beneficiary.status,
  };
}
