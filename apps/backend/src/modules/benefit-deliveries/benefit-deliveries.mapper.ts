import type {
  Administrator,
  Beneficiary,
  Benefit,
  BenefitDelivery,
  CharityProgram,
} from '@prisma/client';
import type { BenefitDeliverySummary } from '@solidarity-network/shared';

type BenefitDeliveryWithRelations = BenefitDelivery & {
  beneficiary: Beneficiary;
  benefit: Benefit;
  charityProgram: CharityProgram;
  administrator: Administrator;
};

export function toBenefitDeliverySummary(
  delivery: BenefitDeliveryWithRelations,
): BenefitDeliverySummary {
  return {
    id: delivery.id,
    beneficiary: {
      id: delivery.beneficiary.id,
      fullName: delivery.beneficiary.fullName,
      document: delivery.beneficiary.document,
    },
    benefit: {
      id: delivery.benefit.id,
      name: delivery.benefit.name,
      category: delivery.benefit.category,
    },
    charityProgram: {
      id: delivery.charityProgram.id,
      name: delivery.charityProgram.name,
      status: delivery.charityProgram.status,
    },
    quantity: delivery.quantity,
    deliveryDate: delivery.deliveryDate.toISOString(),
    notes: delivery.notes,
    administrator: {
      id: delivery.administrator.id,
      name: delivery.administrator.name,
      email: delivery.administrator.email,
      role: delivery.administrator.role,
    },
    reference: delivery.reference,
    createdAt: delivery.createdAt.toISOString(),
  };
}

