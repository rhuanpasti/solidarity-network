import type { Prisma } from '@prisma/client';
import type { AdministratorSummary } from '@solidarity-network/shared';
import { toCharityProgramSummary } from '../charity-programs/charity-programs.mapper';

export type AdministratorWithPrograms = Prisma.AdministratorGetPayload<{
  include: {
    charityPrograms: {
      include: {
        charityProgram: true;
      };
    };
  };
}>;

type AdministratorProgramRelation = AdministratorWithPrograms['charityPrograms'][number];

export function toAdministratorSummary(
  administrator: AdministratorWithPrograms,
): AdministratorSummary {
  return {
    id: administrator.id,
    name: administrator.name,
    email: administrator.email,
    phone: administrator.phone,
    role: administrator.role,
    charityPrograms: administrator.charityPrograms.map((link: AdministratorProgramRelation) =>
      toCharityProgramSummary(link.charityProgram),
    ),
    createdAt: administrator.createdAt.toISOString(),
    updatedAt: administrator.updatedAt.toISOString(),
  };
}
