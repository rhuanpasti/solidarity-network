import { BRAZIL_COUNTRY } from './address';

export function normalizeDigits(value: string) {
  return value.replace(/\D/g, '');
}

export function isBrazilCountry(country?: string | null) {
  return (country ?? '').trim().toLowerCase() === BRAZIL_COUNTRY.toLowerCase();
}

export function isValidBrazilianPostalCode(value: string) {
  return normalizeDigits(value).length === 8;
}

export function formatBrazilianPostalCode(value: string) {
  const digits = normalizeDigits(value).slice(0, 8);
  if (digits.length <= 5) {
    return digits;
  }

  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function isValidBrazilianPhone(value: string) {
  const digits = normalizeDigits(value);

  if (digits.length === 10 || digits.length === 11) {
    return true;
  }

  return digits.length === 12 || digits.length === 13
    ? digits.startsWith('55')
    : false;
}

export function isValidCpf(value: string) {
  const cpf = normalizeDigits(value);

  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  let sum = 0;
  for (let index = 0; index < 9; index += 1) {
    sum += Number(cpf[index]) * (10 - index);
  }

  let remainder = (sum * 10) % 11;
  if (remainder === 10) {
    remainder = 0;
  }

  if (remainder !== Number(cpf[9])) {
    return false;
  }

  sum = 0;
  for (let index = 0; index < 10; index += 1) {
    sum += Number(cpf[index]) * (11 - index);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10) {
    remainder = 0;
  }

  return remainder === Number(cpf[10]);
}
