import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import type { AuthenticatedUser } from '../auth/auth.types';
import { BeneficiaryPortalService } from './beneficiary-portal.service';

const actor: AuthenticatedUser = {
  sub: 'beneficiary-1',
  username: 'beneficiary@example.org',
  name: 'Ana Souza',
  email: 'beneficiary@example.org',
  role: null,
  accountType: 'beneficiary',
  programIds: ['program-active', 'program-inactive'],
  mustChangePassword: false,
  csrfToken: 'csrf',
  iat: 0,
  exp: 0,
};

const beneficiary = {
  id: 'beneficiary-1',
  fullName: 'Ana Souza',
  document: '52998224725',
  birthDate: new Date('1991-02-14T00:00:00.000Z'),
  email: 'beneficiary@example.org',
  phone: '+55 11 96540-1101',
  status: 'active',
  dependents: [
    {
      id: 'dependent-1',
      fullName: 'Julia Souza',
      relationship: 'child',
      document: null,
      birthDate: new Date('2016-05-10T00:00:00.000Z'),
    },
  ],
  charityPrograms: [
    {
      charityProgram: {
        id: 'program-active',
        name: 'Food Security',
        description: 'Monthly food support.',
        status: 'active',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      },
    },
    {
      charityProgram: {
        id: 'program-inactive',
        name: 'School Support',
        description: 'School supplies.',
        status: 'inactive',
        createdAt: new Date('2026-02-01T00:00:00.000Z'),
        updatedAt: new Date('2026-02-02T00:00:00.000Z'),
      },
    },
  ],
};

function makeDelivery(overrides: Record<string, unknown>) {
  return {
    id: 'delivery-1',
    reference: 'REF-001',
    quantity: 1,
    deliveryDate: new Date('2026-04-26T14:00:00.000Z'),
    notes: 'Delivery notes',
    createdAt: new Date('2026-04-20T14:00:00.000Z'),
    benefit: {
      id: 'benefit-1',
      name: 'Food Basket',
      category: 'food',
    },
    charityProgram: {
      id: 'program-active',
      name: 'Food Security',
      status: 'active',
    },
    ...overrides,
  };
}

describe('BeneficiaryPortalService', () => {
  it('returns programs, beneficiaries, upcoming deliveries, and past deliveries', async () => {
    const upcomingDelivery = makeDelivery({ id: 'upcoming-delivery' });
    const pastDelivery = makeDelivery({
      id: 'past-delivery',
      reference: 'REF-PAST',
      deliveryDate: new Date('2026-04-20T14:00:00.000Z'),
    });
    const deliveryResults = [[upcomingDelivery], [pastDelivery]];
    const findMany = mock.fn(async () => deliveryResults.shift() ?? []);
    const prisma = {
      beneficiary: {
        findUnique: mock.fn(async () => beneficiary),
      },
      benefitDelivery: {
        findMany,
      },
    };
    const service = new BeneficiaryPortalService(prisma as never);

    const result = await service.getOverview(actor);

    assert.equal(prisma.beneficiary.findUnique.mock.callCount(), 1);
    assert.equal(findMany.mock.callCount(), 2);
    assert.equal(result.programs.length, 2);
    assert.equal(result.programs[1]?.status, 'inactive');
    assert.deepEqual(
      result.beneficiaries.map((person) => [person.fullName, person.relationship]),
      [
        ['Ana Souza', 'primary'],
        ['Julia Souza', 'child'],
      ],
    );
    assert.equal(result.upcomingDeliveries[0]?.id, 'upcoming-delivery');
    assert.equal(result.pastDeliveries[0]?.id, 'past-delivery');
    assert.equal(result.pastDeliveries[0]?.quantity, 1);
  });
});
