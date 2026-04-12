import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import {
  isValidBrazilianPhone,
  isValidBrazilianPostalCode,
  isValidCpf,
  normalizeDigits,
} from '@solidarity-network/shared';

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
