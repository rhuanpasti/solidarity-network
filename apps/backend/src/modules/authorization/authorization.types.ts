export const AuthorizationRoutePolicy = {
  ViewAdministrators: 'view_administrators',
  ManageAdministrators: 'manage_administrators',
  CreateCharityProgram: 'create_charity_program',
  AccessPrograms: 'access_programs',
  ManageBenefits: 'manage_benefits',
  ManageBeneficiaries: 'manage_beneficiaries',
  ManageDeliveries: 'manage_deliveries',
  AccessBeneficiaryPortal: 'access_beneficiary_portal',
} as const;

export type AuthorizationRoutePolicy =
  (typeof AuthorizationRoutePolicy)[keyof typeof AuthorizationRoutePolicy];

export interface ProgramAccessScope {
  hasGlobalAccess: boolean;
  allowedProgramIds: string[];
}

