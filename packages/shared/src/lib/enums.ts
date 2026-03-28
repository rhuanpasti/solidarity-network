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

export const BeneficiaryStatus = {
  Active: 'active',
  Inactive: 'inactive',
  Archived: 'archived',
} as const;

export type BeneficiaryStatus =
  (typeof BeneficiaryStatus)[keyof typeof BeneficiaryStatus];

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
