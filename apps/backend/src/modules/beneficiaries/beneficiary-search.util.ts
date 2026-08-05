import type { Prisma } from '@prisma/client';

export function buildBeneficiarySearchFilters(
  search: string,
): Prisma.BeneficiaryWhereInput[] {
  const normalizedSearch = search.trim();
  const digitsOnly = normalizedSearch.replace(/\D/g, '');
  const documentTerms = new Set([normalizedSearch]);

  if (digitsOnly.length === 11) {
    documentTerms.add(digitsOnly);
    documentTerms.add(
      `${digitsOnly.slice(0, 3)}.${digitsOnly.slice(3, 6)}.${digitsOnly.slice(6, 9)}-${digitsOnly.slice(9)}`,
    );
  }

  return [
    { fullName: { contains: normalizedSearch, mode: 'insensitive' } },
    { email: { contains: normalizedSearch, mode: 'insensitive' } },
    ...[...documentTerms].map((term) => ({
      document: { contains: term, mode: 'insensitive' as const },
    })),
  ];
}
