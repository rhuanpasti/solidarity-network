import { BadRequestException } from '@nestjs/common';
import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { DomainNotFoundException } from '../../common/exceptions/domain-not-found.exception';
import type { AuthenticatedUser } from '../auth/auth.types';
import { BenefitDeliveriesService } from './benefit-deliveries.service';

const actor: AuthenticatedUser = {
  sub: 'admin-1',
  username: 'case-worker',
  name: 'Case Worker',
  email: 'case@example.org',
  role: 'case_worker',
  accountType: 'administrator',
  programIds: ['program-1'],
  mustChangePassword: false,
  sessionVersion: 0,
  csrfToken: 'csrf',
  iat: 0,
  exp: 0,
};

const dto = {
  beneficiaryId: 'beneficiary-1',
  benefitId: 'benefit-1',
  charityProgramId: 'program-1',
  quantity: 2,
  deliveryDate: '2026-04-23T12:00:00.000Z',
  notes: 'Delivered at home',
  reference: 'REF-001',
};

function makeDelivery(overrides: Record<string, unknown> = {}) {
  return {
    id: 'delivery-1',
    beneficiaryId: dto.beneficiaryId,
    benefitId: dto.benefitId,
    charityProgramId: dto.charityProgramId,
    quantity: dto.quantity,
    deliveryDate: new Date(dto.deliveryDate),
    notes: dto.notes,
    administratorId: actor.sub,
    reference: dto.reference,
    createdAt: new Date('2026-04-23T12:30:00.000Z'),
    beneficiary: {
      id: dto.beneficiaryId,
      fullName: 'Maria Silva',
      document: '52998224725',
      email: 'maria@example.org',
    },
    benefit: {
      id: dto.benefitId,
      name: 'Food Basket',
      category: 'food',
    },
    charityProgram: {
      id: dto.charityProgramId,
      name: 'Food Security',
      status: 'active',
    },
    administrator: {
      id: actor.sub,
      name: actor.name,
      email: actor.email,
      role: actor.role,
    },
    ...overrides,
  };
}

function makeService(overrides: {
  beneficiary?: unknown;
  benefit?: unknown;
  charityProgram?: unknown;
  administrator?: unknown;
} = {}) {
  const resolveOverride = (key: keyof typeof overrides, fallback: unknown) =>
    Object.hasOwn(overrides, key) ? overrides[key] : fallback;
  const delivery = makeDelivery();
  const auditTrailService = { record: mock.fn() };
  const entityVersioningService = { recordVersion: mock.fn() };
  const authorizationService = {
    assertCanRegisterDelivery: mock.fn(),
    getProgramScope: mock.fn(() => ({ hasGlobalAccess: false, allowedProgramIds: ['program-1'] })),
  };
  const repository = {
    create: mock.fn(async () => delivery),
    findMany: mock.fn(),
    count: mock.fn(),
    findById: mock.fn(),
  };
  const beneficiariesRepository = {
    findById: mock.fn(async () => resolveOverride('beneficiary', {
      id: dto.beneficiaryId,
      charityPrograms: [{ charityProgramId: dto.charityProgramId }],
    })),
  };
  const benefitsRepository = {
    findById: mock.fn(async () => resolveOverride('benefit', { id: dto.benefitId, active: true })),
  };
  const charityProgramsRepository = {
    findById: mock.fn(async () => resolveOverride('charityProgram', { id: dto.charityProgramId })),
  };
  const administratorsRepository = {
    findAnyById: mock.fn(async () => resolveOverride('administrator', {
      id: actor.sub,
      role: actor.role,
      charityPrograms: [{ charityProgramId: dto.charityProgramId }],
    })),
  };
  const emailService = { send: mock.fn() };

  return {
    service: new BenefitDeliveriesService(
      auditTrailService as never,
      entityVersioningService as never,
      authorizationService as never,
      repository as never,
      beneficiariesRepository as never,
      benefitsRepository as never,
      charityProgramsRepository as never,
      administratorsRepository as never,
      emailService as never,
    ),
    auditTrailService,
    entityVersioningService,
    authorizationService,
    repository,
    emailService,
  };
}

describe('BenefitDeliveriesService', () => {
  it('creates a delivery, records an audit event, and maps the summary', async () => {
    const {
      service,
      auditTrailService,
      entityVersioningService,
      authorizationService,
      repository,
    } = makeService();

    const result = await service.create(dto, actor);

    assert.equal(authorizationService.assertCanRegisterDelivery.mock.callCount(), 1);
    assert.deepEqual(repository.create.mock.calls[0]?.arguments[0], {
      beneficiaryId: dto.beneficiaryId,
      benefitId: dto.benefitId,
      charityProgramId: dto.charityProgramId,
      quantity: dto.quantity,
      deliveryDate: new Date(dto.deliveryDate),
      notes: dto.notes,
      administratorId: actor.sub,
      reference: dto.reference,
    });
    assert.equal(auditTrailService.record.mock.callCount(), 1);
    assert.equal(entityVersioningService.recordVersion.mock.callCount(), 1);
    assert.equal(
      entityVersioningService.recordVersion.mock.calls[0]?.arguments[0].entityType,
      'benefit_delivery',
    );
    assert.equal(result.id, 'delivery-1');
    assert.equal(result.beneficiary.fullName, 'Maria Silva');
    assert.equal(result.createdAt, '2026-04-23T12:30:00.000Z');
  });

  it('sends a new delivery notification email with the expected template variables', async () => {
    const { service, emailService } = makeService();

    await service.create(dto, actor);

    assert.equal(emailService.send.mock.callCount(), 1);
    assert.deepEqual(emailService.send.mock.calls[0]?.arguments[0], {
      to: {
        email: 'maria@example.org',
        name: 'Maria Silva',
      },
      template: 'new-delivery-notification',
      variables: {
        userName: 'Maria Silva',
        deliveryTitle: 'Food Basket',
        deliveryType: 'food',
        deliveryDate: '2026-04-23T12:00:00.000Z',
        programName: 'Food Security',
        organizationName: 'Solidarity Network',
      },
    });
  });

  it('rejects inactive benefits before creating a delivery', async () => {
    const { service, repository } = makeService({ benefit: { id: dto.benefitId, active: false } });

    await assert.rejects(() => service.create(dto, actor), BadRequestException);
    assert.equal(repository.create.mock.callCount(), 0);
  });

  it('rejects beneficiaries outside the selected program', async () => {
    const { service, repository } = makeService({
      beneficiary: { id: dto.beneficiaryId, charityPrograms: [{ charityProgramId: 'other-program' }] },
    });

    await assert.rejects(() => service.create(dto, actor), BadRequestException);
    assert.equal(repository.create.mock.callCount(), 0);
  });

  it('rejects missing related records', async () => {
    const { service, repository } = makeService({ beneficiary: null });

    await assert.rejects(() => service.create(dto, actor), DomainNotFoundException);
    assert.equal(repository.create.mock.callCount(), 0);
  });
});
