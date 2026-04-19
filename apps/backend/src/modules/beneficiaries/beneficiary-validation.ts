import {
  BRAZIL_COUNTRY,
  WORLD_COUNTRY,
  formatBrazilianPostalCode,
  isBrazilCountry,
  isValidBrazilianPhone,
  isValidBrazilianPostalCode,
  isValidCpf,
  normalizeDigits,
  type Address,
} from '@solidarity-network/shared';

export interface BeneficiaryValidationInput {
  document: string;
  phone: string;
  address: Address;
}

export function normalizeBeneficiaryInput<TInput extends BeneficiaryValidationInput>(
  input: TInput,
): TInput {
  const country = isBrazilCountry(input.address.country)
    ? BRAZIL_COUNTRY
    : WORLD_COUNTRY;

  return {
    ...input,
    document:
      country === BRAZIL_COUNTRY
        ? normalizeDigits(input.document)
        : input.document.trim(),
    phone: input.phone.trim(),
    address: {
      ...input.address,
      postalCode:
        country === BRAZIL_COUNTRY
          ? formatBrazilianPostalCode(input.address.postalCode)
          : input.address.postalCode.trim(),
      country,
    },
  };
}

export function getBeneficiaryValidationErrors(input: BeneficiaryValidationInput) {
  const errors: string[] = [];
  const normalized = normalizeBeneficiaryInput(input);

  if (isBrazilCountry(normalized.address.country)) {
    if (!isValidCpf(normalized.document)) {
      errors.push('Invalid CPF for a beneficiary with country Brazil.');
    }

    if (!isValidBrazilianPhone(normalized.phone)) {
      errors.push('Invalid phone number for a beneficiary with country Brazil.');
    }

    if (!isValidBrazilianPostalCode(normalized.address.postalCode)) {
      errors.push('Invalid postal code for a beneficiary with country Brazil.');
    }
  }

  return errors;
}
