import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DemoDataService } from './demo-data.service';

function createService(enabled = true) {
  return new DemoDataService({
    get: (key: string) =>
      ({
        DEMO_MODE: enabled,
        DEMO_USER_USERNAME: 'demo-user',
        DEMO_USER_EMAIL: 'demo@solidarity-network.local',
        DEMO_USER_PASSWORD: 'demo-password',
      } as Record<string, unknown>)[key],
  } as never);
}

describe('DemoDataService', () => {
  it('authenticates only the configured demo credentials', () => {
    const service = createService();

    assert.equal(service.authenticate('demo@solidarity-network.local', 'wrong'), null);
    assert.equal(
      service.authenticate('demo@solidarity-network.local', 'demo-password')?.isDemo,
      true,
    );
    assert.equal(
      service.authenticate('demo-user', 'demo-password')?.username,
      'demo-user',
    );
  });

  it('returns synthetic records and previews without a persistence dependency', () => {
    const service = createService();
    const programs = service.listPrograms({ page: 1, pageSize: 100 });
    const preview = service.previewProgram({
      name: 'Temporary program',
      description: 'Only a demo preview',
      status: 'active',
    });

    assert.equal(programs.meta.totalItems, 3);
    assert.match(programs.items[0]!.id, /^demo-program-/);
    assert.equal(preview.id, 'demo-preview-program');
  });

  it('never echoes real CPF or cellphone values in demo previews', () => {
    const service = createService();
    const preview = service.previewBeneficiary({
      fullName: 'Demo Beneficiary',
      document: '52998224725',
      birthDate: '1990-01-01',
      phone: '+55 11 99999-9999',
      address: {
        street: 'Demo Street',
        number: '1',
        district: 'Demo District',
        city: 'Sao Paulo',
        state: 'SP',
        postalCode: '01000-000',
        country: 'Brazil',
      },
      status: 'active',
    });

    assert.equal(preview.beneficiary.document, '00000000000');
    assert.equal(preview.beneficiary.phone, '999999999');

    const administratorPreview = service.previewAdministrator({
      name: 'Demo Administrator',
      email: 'demo-administrator@example.org',
      phone: '+55 11 98888-0000',
      role: 'case_worker',
      charityProgramIds: [],
    });

    assert.equal(administratorPreview.administrator.phone, '999999999');
  });
});
