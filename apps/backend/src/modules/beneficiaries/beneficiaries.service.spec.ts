import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { BadRequestException } from '@nestjs/common';
import { BeneficiariesService } from './beneficiaries.service';

describe('BeneficiariesService demo mode', () => {
  it('returns a synthetic credential preview instead of persisting a beneficiary', async () => {
    const repository = { create: mock.fn() };
    const demoDataService = {
      isDemoUser: () => true,
      previewBeneficiary: mock.fn(() => ({
        beneficiary: { id: 'demo-preview-beneficiary' },
        generatedPasskey: '0000000000000000',
      })),
    };
    const service = new BeneficiariesService(
      {} as never,
      {} as never,
      {
        assertCanEditBeneficiary: mock.fn(),
        assertCanAssignBeneficiaryPrograms: mock.fn(),
      } as never,
      repository as never,
      {} as never,
      {} as never,
      demoDataService as never,
    );

    const result = await service.create(
      {
        fullName: 'Demo Person',
        document: '52998224725',
        birthDate: '1990-01-01',
        email: 'demo.person@example.org',
        phone: '+55 11 99999-9999',
        address: {
          street: 'Rua Demo',
          number: '1',
          district: 'Centro',
          city: 'Sao Paulo',
          state: 'SP',
          postalCode: '01000-000',
          country: 'Brazil',
        },
        status: 'active',
      } as never,
      { isDemo: true } as never,
    );

    assert.equal(result.beneficiary.id, 'demo-preview-beneficiary');
    assert.equal(repository.create.mock.callCount(), 0);
    assert.equal(demoDataService.previewBeneficiary.mock.callCount(), 1);
  });

  it('rejects non-empty dependent lists before creating a beneficiary', async () => {
    const repository = { create: mock.fn() };
    const service = new BeneficiariesService(
      {} as never,
      {} as never,
      {
        assertCanEditBeneficiary: mock.fn(),
        assertCanAssignBeneficiaryPrograms: mock.fn(),
      } as never,
      repository as never,
      {} as never,
      {} as never,
    );

    await assert.rejects(
      () =>
        service.create(
          { dependents: [{ fullName: 'Julia Souza' }] } as never,
          {} as never,
        ),
      (error: unknown) => {
        assert.equal(error instanceof BadRequestException, true);
        assert.deepEqual((error as BadRequestException).getResponse(), {
          code: 'BENEFICIARY_DEPENDENTS_DISABLED',
          message: 'Beneficiary dependents are temporarily disabled.',
        });
        return true;
      },
    );

    assert.equal(repository.create.mock.callCount(), 0);
  });

  it('rejects non-empty dependent lists before updating a beneficiary', async () => {
    const repository = { findById: mock.fn(), update: mock.fn() };
    const service = new BeneficiariesService(
      {} as never,
      {} as never,
      {} as never,
      repository as never,
      {} as never,
      {} as never,
    );

    await assert.rejects(
      () =>
        service.update(
          'beneficiary-1',
          { dependents: [{ fullName: 'Julia Souza' }] } as never,
          {} as never,
        ),
      (error: unknown) => {
        assert.equal(error instanceof BadRequestException, true);
        assert.deepEqual((error as BadRequestException).getResponse(), {
          code: 'BENEFICIARY_DEPENDENTS_DISABLED',
          message: 'Beneficiary dependents are temporarily disabled.',
        });
        return true;
      },
    );

    assert.equal(repository.findById.mock.callCount(), 0);
    assert.equal(repository.update.mock.callCount(), 0);
  });
});
