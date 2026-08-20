import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { CharityProgramsService } from './charity-programs.service';

describe('CharityProgramsService demo mode', () => {
  it('lists synthetic programs without querying the repository', async () => {
    const repository = { findMany: mock.fn(), count: mock.fn() };
    const demoDataService = {
      isDemoUser: () => true,
      listPrograms: mock.fn(() => ({ items: [], meta: { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 } })),
      previewProgram: mock.fn(() => ({ id: 'demo-preview-program' })),
    };
    const service = new CharityProgramsService(
      { assertCanCreateCharityProgram: mock.fn(), getProgramScope: mock.fn() } as never,
      repository as never,
      demoDataService as never,
    );

    const result = await service.findAll({ page: 1, pageSize: 10 } as never, { isDemo: true } as never);

    assert.deepEqual(result.items, []);
    assert.equal(repository.findMany.mock.callCount(), 0);
    assert.equal(repository.count.mock.callCount(), 0);
    assert.equal(demoDataService.listPrograms.mock.callCount(), 1);
  });

  it('returns a preview instead of creating a database record', async () => {
    const repository = { create: mock.fn() };
    const demoDataService = {
      isDemoUser: () => true,
      previewProgram: mock.fn(() => ({ id: 'demo-preview-program' })),
    };
    const service = new CharityProgramsService(
      { assertCanCreateCharityProgram: mock.fn() } as never,
      repository as never,
      demoDataService as never,
    );

    const result = await service.create(
      { name: 'Temporary', description: 'Preview', status: 'active' } as never,
      { isDemo: true } as never,
    );

    assert.equal(result.id, 'demo-preview-program');
    assert.equal(repository.create.mock.callCount(), 0);
  });
});
