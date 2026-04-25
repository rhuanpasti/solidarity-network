export const CharityProgramStatus = {
  Active: 'active',
  Inactive: 'inactive',
} as const;

export type CharityProgramStatus =
  (typeof CharityProgramStatus)[keyof typeof CharityProgramStatus];

export const AdministratorRole = {
  SuperAdmin: 'super_admin',
  ProgramManager: 'program_manager',
  CaseWorker: 'case_worker',
} as const;

export type AdministratorRole =
  (typeof AdministratorRole)[keyof typeof AdministratorRole];

export const AccountType = {
  Administrator: 'administrator',
  Beneficiary: 'beneficiary',
} as const;

export type AccountType =
  (typeof AccountType)[keyof typeof AccountType];

export const BeneficiaryStatus = {
  Active: 'active',
  Inactive: 'inactive',
  Archived: 'archived',
} as const;

export type BeneficiaryStatus =
  (typeof BeneficiaryStatus)[keyof typeof BeneficiaryStatus];

export const BeneficiaryDependentRelationship = {
  Child: 'child',
  Grandchild: 'grandchild',
  Other: 'other',
} as const;

export type BeneficiaryDependentRelationship =
  (typeof BeneficiaryDependentRelationship)[keyof typeof BeneficiaryDependentRelationship];

export const BenefitCategory = {
  Food: 'food',
  Hygiene: 'hygiene',
  Financial: 'financial',
  Education: 'education',
  Clothing: 'clothing',
  Medicine: 'medicine',
  Other: 'other',
} as const;

export type BenefitCategory =
  (typeof BenefitCategory)[keyof typeof BenefitCategory];
