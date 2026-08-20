import type {
  Beneficiary,
  CharityProgram,
  Prisma,
} from '@prisma/client';
import type { Address, BeneficiarySummary } from '@solidarity-network/shared';
import { toCharityProgramSummary } from '../charity-programs/charity-programs.mapper';

export type BeneficiaryWithPrograms = Beneficiary & {
  charityPrograms: Array<{
    beneficiaryId: string;
    charityProgramId: string;
    charityProgram: CharityProgram;
  }>;
  address: Prisma.JsonValue;
};

export function toBeneficiarySummary(
  beneficiary: BeneficiaryWithPrograms,
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
    // Dependents are temporarily disabled and are never exposed by the API.
    dependents: [],
    charityPrograms: beneficiary.charityPrograms.map((link) => toCharityProgramSummary(link.charityProgram)),
    createdAt: beneficiary.createdAt.toISOString(),
    status: beneficiary.status,
  };
}
