import type { Address } from './address';
import {
  AccountType,
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

export interface CreateAdministratorResult {
  administrator: AdministratorSummary;
  generatedPasskey: string;
}

export interface BeneficiarySummary {
  id: string;
  fullName: string;
  document: string;
  birthDate: string | null;
  email: string | null;
  phone: string;
  address: Address;
  notes: string | null;
  charityProgram: CharityProgramSummary | null;
  createdAt: string;
  status: BeneficiaryStatus;
}

export interface CreateBeneficiaryResult {
  beneficiary: BeneficiarySummary;
  generatedPasskey: string;
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

export interface BeneficiaryPortalSummary {
  beneficiary: Pick<
    BeneficiarySummary,
  'id' | 'fullName' | 'document' | 'birthDate' | 'email' | 'phone' | 'status'
  > & {
    charityProgram: CharityProgramSummary | null;
  };
  upcomingDeliveries: Array<{
    id: string;
    reference: string;
    deliveryDate: string;
    benefit: Pick<BenefitSummary, 'id' | 'name' | 'category'>;
    charityProgram: Pick<CharityProgramSummary, 'id' | 'name' | 'status'>;
  }>;
}

export interface AuthUserSummary {
  id: string;
  username: string;
  name: string;
  email: string;
  role: AdministratorRole | null;
  accountType: AccountType;
  mustChangePassword: boolean;
}
