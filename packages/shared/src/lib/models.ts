import type { Address } from './address';
import {
  AdministratorRole,
  BeneficiaryStatus,
  BenefitCategory,
  CharityProgramStatus,
} from './enums';

export interface CharityProgramSummary {
  id: string;
  name: string;
  description: string;
  status: CharityProgramStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AdministratorSummary {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: AdministratorRole;
  charityPrograms: CharityProgramSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface BeneficiarySummary {
  id: string;
  fullName: string;
  document: string;
  birthDate: string | null;
  phone: string;
  address: Address;
  notes: string | null;
  charityProgram: CharityProgramSummary;
  createdAt: string;
  status: BeneficiaryStatus;
}

export interface BenefitSummary {
  id: string;
  name: string;
  description: string;
  category: BenefitCategory;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BenefitDeliverySummary {
  id: string;
  beneficiary: Pick<BeneficiarySummary, 'id' | 'fullName' | 'document'>;
  benefit: Pick<BenefitSummary, 'id' | 'name' | 'category'>;
  charityProgram: Pick<CharityProgramSummary, 'id' | 'name' | 'status'>;
  quantity: number;
  deliveryDate: string;
  notes: string | null;
  administrator: Pick<AdministratorSummary, 'id' | 'name' | 'email' | 'role'>;
  reference: string;
  createdAt: string;
}
