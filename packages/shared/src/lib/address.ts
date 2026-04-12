export const BRAZIL_COUNTRY = 'Brazil';
export const WORLD_COUNTRY = 'World';

export const SUPPORTED_COUNTRIES = [BRAZIL_COUNTRY, WORLD_COUNTRY] as const;

export type SupportedCountry = (typeof SUPPORTED_COUNTRIES)[number];

export interface Address {
  street: string;
  number: string;
  district: string;
  city: string;
  state: string;
  postalCode: string;
  country: SupportedCountry;
  complement?: string;
}
