import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildDemoSeedData } from './demo-seed-data';

describe('buildDemoSeedData', () => {
  it('returns realistic demo records with multiple programs and beneficiary profiles', () => {
    const data = buildDemoSeedData(new Date('2026-04-23T12:00:00.000Z'));

    assert.equal(data.programs.length, 3);
    assert.equal(data.beneficiaries.length, 5);
    assert.ok(data.beneficiaries.some((beneficiary) => beneficiary.status === 'inactive'));
    assert.ok(
      data.beneficiaries.every(
        (beneficiary) =>
          beneficiary.notes.length > 40 && beneficiary.programKeys.length >= 1,
      ),
    );
    assert.ok(
      data.beneficiaries.some(
        (beneficiary) => beneficiary.programKeys.length > 1,
      ),
    );
  });

  it('keeps delivery relationships consistent with beneficiary and administrator program membership', () => {
    const data = buildDemoSeedData(new Date('2026-04-23T12:00:00.000Z'));
    const beneficiaries = new Map(
      data.beneficiaries.map((beneficiary) => [beneficiary.key, beneficiary]),
    );
    const administrators = new Map(
      data.administrators.map((administrator) => [administrator.key, administrator]),
    );
    const benefits = new Map(data.benefits.map((benefit) => [benefit.key, benefit]));

    assert.ok(data.deliveries.length >= 8);

    for (const delivery of data.deliveries) {
      const beneficiary = beneficiaries.get(delivery.beneficiaryKey);
      const administrator = administrators.get(delivery.administratorKey);
      const benefit = benefits.get(delivery.benefitKey);

      assert.ok(beneficiary, `missing beneficiary for ${delivery.reference}`);
      assert.ok(administrator, `missing administrator for ${delivery.reference}`);
      assert.ok(benefit, `missing benefit for ${delivery.reference}`);
      assert.ok(
        beneficiary.programKeys.includes(delivery.programKey),
        `beneficiary ${delivery.beneficiaryKey} is not linked to ${delivery.programKey}`,
      );
      assert.ok(
        administrator.isSystemRoot ||
          administrator.programKeys.includes(delivery.programKey),
        `administrator ${delivery.administratorKey} is not linked to ${delivery.programKey}`,
      );
      assert.ok(delivery.deliveryDate instanceof Date);
      assert.ok(delivery.notes.length > 20);
    }
  });
});
