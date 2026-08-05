import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CharityProgramStatus } from '@solidarity-network/shared';
import { buildCharityProgramWhere } from './charity-programs.repository';

describe('charity program list filters', () => {
  it('combines active status and text search filters', () => {
    const where = buildCharityProgramWhere('food', CharityProgramStatus.Active);

    assert.deepEqual(where, {
      AND: [
        { status: CharityProgramStatus.Active },
        {
          OR: [
            { name: { contains: 'food', mode: 'insensitive' } },
            { description: { contains: 'food', mode: 'insensitive' } },
          ],
        },
      ],
    });
  });
});
