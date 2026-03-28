import type { Benefit } from '@prisma/client';
import type { BenefitSummary } from '@solidarity-network/shared';

export function toBenefitSummary(benefit: Benefit): BenefitSummary {
  return {
    id: benefit.id,
    name: benefit.name,
    description: benefit.description,
    category: benefit.category,
    active: benefit.active,
    createdAt: benefit.createdAt.toISOString(),
    updatedAt: benefit.updatedAt.toISOString(),
  };
}

