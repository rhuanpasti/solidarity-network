import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import {
  isValidBrazilianPhone,
  isValidBrazilianPostalCode,
  isValidCpf,
  normalizeDigits,
} from '@solidarity-network/shared';

export function formatCpf(value: string) {
  const digits = normalizeDigits(value).slice(0, 11);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  }

  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function formatCpfForDisplay(value: string | null | undefined) {
  if (!value) {
    return value ?? '';
  }

  return normalizeDigits(value).length === 11 ? formatCpf(value) : value;
}

export function formatBrazilianPhone(value: string) {
  const digits = normalizeDigits(value).slice(0, 11);

  if (!digits) {
    return '';
  }

  if (digits.length <= 2) {
    return digits.length === 2 ? `(${digits})` : `(${digits}`;
  }

  const areaCode = digits.slice(0, 2);
  const number = digits.slice(2);
  const firstGroupLength = digits.length >= 11 ? 5 : 4;

  if (number.length <= firstGroupLength) {
    return `(${areaCode}) ${number}`;
  }

  return `(${areaCode}) ${number.slice(0, firstGroupLength)}-${number.slice(firstGroupLength)}`;
}

export function formatBrazilianPhoneForDisplay(value: string | null | undefined) {
  if (!value) {
    return value ?? '';
  }

  const trimmedValue = value.trim();

  if (trimmedValue.startsWith('+') && !trimmedValue.startsWith('+55')) {
    return value;
  }

  let digits = normalizeDigits(value);

  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    digits = digits.slice(2);
  }

  return digits.length === 10 || digits.length === 11 ? formatBrazilianPhone(digits) : value;
}

export function cpfValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();

    if (!value) {
      return null;
    }

    return isValidCpf(value) ? null : { cpf: true };
  };
}

export function brazilianPhoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();

    if (!value) {
      return null;
    }

    return isValidBrazilianPhone(value) ? null : { brazilianPhone: true };
  };
}

export function brazilianPostalCodeValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();

    if (!value) {
      return null;
    }

    return isValidBrazilianPostalCode(value) ? null : { postalCode: true };
  };
}

export function genericPhoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();

    if (!value) {
      return null;
    }

    const digits = normalizeDigits(value);
    return digits.length >= 8 && digits.length <= 15 ? null : { phone: true };
  };
}
