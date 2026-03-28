import type { CharityProgram } from '@prisma/client';
import type { CharityProgramSummary } from '@solidarity-network/shared';

export function toCharityProgramSummary(
  charityProgram: CharityProgram,
): CharityProgramSummary {
  return {
    id: charityProgram.id,
    name: charityProgram.name,
    description: charityProgram.description,
    status: charityProgram.status,
    createdAt: charityProgram.createdAt.toISOString(),
    updatedAt: charityProgram.updatedAt.toISOString(),
  };
}

