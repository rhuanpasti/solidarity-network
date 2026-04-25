import type { BeneficiaryDependentRelationship } from '@solidarity-network/shared';

export interface BeneficiaryDependentInput {
  fullName: string;
  relationship: BeneficiaryDependentRelationship;
  document?: string | null;
  birthDate: string;
}

export interface NormalizedBeneficiaryDependent {
  fullName: string;
  relationship: BeneficiaryDependentRelationship;
  document: string | null;
  birthDate: Date;
}

export function normalizeBeneficiaryDependents(
  dependents: BeneficiaryDependentInput[] | undefined,
) {
  return (dependents ?? []).map((dependent) => ({
    fullName: dependent.fullName.trim(),
    relationship: dependent.relationship,
    document: normalizeDependentDocument(dependent.document),
    birthDate: new Date(dependent.birthDate),
  }));
}

export function getBeneficiaryDependentsValidationErrors(
  dependents: NormalizedBeneficiaryDependent[],
  referenceDate = new Date(),
) {
  const errors: string[] = [];

  dependents.forEach((dependent, index) => {
    if (Number.isNaN(dependent.birthDate.getTime())) {
      errors.push(`Dependent ${index + 1} has an invalid birth date.`);
      return;
    }

    if (dependent.birthDate > referenceDate) {
      errors.push(`Dependent ${index + 1} birth date cannot be in the future.`);
      return;
    }

    if (!isUnder18(dependent.birthDate, referenceDate)) {
      errors.push(`Dependent ${index + 1} must be under 18 years old.`);
    }
  });

  return errors;
}

function normalizeDependentDocument(document: string | null | undefined) {
  const normalizedDocument = document?.trim();
  return normalizedDocument ? normalizedDocument : null;
}

function isUnder18(birthDate: Date, referenceDate: Date) {
  const eighteenthBirthday = new Date(birthDate);
  eighteenthBirthday.setUTCFullYear(eighteenthBirthday.getUTCFullYear() + 18);

  return eighteenthBirthday > referenceDate;
}
