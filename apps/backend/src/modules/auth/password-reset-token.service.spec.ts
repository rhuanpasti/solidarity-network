import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { PasswordResetTokenService } from './password-reset-token.service';

function makeService() {
  const records = new Map<string, {
    id: string;
    tokenHash: string;
    accountId: string;
    accountType: string;
    email: string;
    expiresAt: Date;
    usedAt: Date | null;
  }>();
  let nextId = 1;
  const prisma = {
    passwordResetToken: {
      create: mock.fn(async ({ data }: { data: TokenRecordInput }) => {
        const saved = { id: `token-${nextId++}`, ...data, usedAt: null };
        records.set(saved.tokenHash, saved);
        return saved;
      }),
      findUnique: mock.fn(async ({ where }: { where: { tokenHash: string } }) =>
        records.get(where.tokenHash) ?? null),
      updateMany: mock.fn(async ({ where, data }: { where: Record<string, unknown>; data: { usedAt: Date } }) => {
        let count = 0;
        for (const record of records.values()) {
          const matchesAccount =
            where.accountId === undefined || record.accountId === where.accountId;
          const matchesType =
            where.accountType === undefined || record.accountType === where.accountType;
          const matchesId = where.id === undefined || record.id === where.id;
          const matchesUnused = where.usedAt === undefined || record.usedAt === where.usedAt;
          const expiresAt = where.expiresAt as { gt?: Date } | undefined;
          const matchesExpiry = !expiresAt?.gt || record.expiresAt > expiresAt.gt;
          if (matchesAccount && matchesType && matchesId && matchesUnused && matchesExpiry) {
            record.usedAt = data.usedAt;
            count += 1;
          }
        }
        return { count };
      }),
      deleteMany: mock.fn(async () => ({ count: 0 })),
    },
  };
  const service = new PasswordResetTokenService(
    {
      get: mock.fn((key: string) => ({
        JWT_SECRET: 'unused',
        APP_PUBLIC_URL: 'https://app.example.org',
        PASSWORD_RESET_PATH: '/reset-password',
      })[key]),
    } as never,
    prisma as never,
  );
  return { service, records };
}

type TokenRecordInput = {
  tokenHash: string;
  accountId: string;
  accountType: string;
  email: string;
  expiresAt: Date;
};

describe('PasswordResetTokenService', () => {
  it('stores only a hash and verifies a valid token', async () => {
    const { service, records } = makeService();

    const token = await service.createToken({
      accountId: 'account-1',
      accountType: 'beneficiary',
      email: 'maria@example.org',
    });

    assert.deepEqual(await service.verifyToken(token), {
      accountId: 'account-1',
      accountType: 'beneficiary',
      email: 'maria@example.org',
    });
    assert.equal([...records.values()][0]?.tokenHash.includes(token), false);
  });

  it('rejects expired, tampered, and nonexistent tokens', async () => {
    const { service, records } = makeService();
    const token = await service.createToken({
      accountId: 'account-1',
      accountType: 'beneficiary',
      email: 'maria@example.org',
    });
    [...records.values()][0]!.expiresAt = new Date(Date.now() - 1);

    assert.equal(await service.verifyToken(token), null);
    assert.equal(await service.verifyToken(`${token}tampered`), null);
    assert.equal(await service.verifyToken('nonexistent-token'), null);
  });

  it('consumes a token once and invalidates the previous token for the account', async () => {
    const { service } = makeService();
    const first = await service.createToken({
      accountId: 'account-1',
      accountType: 'beneficiary',
      email: 'maria@example.org',
    });
    const second = await service.createToken({
      accountId: 'account-1',
      accountType: 'beneficiary',
      email: 'maria@example.org',
    });

    assert.equal(await service.verifyToken(first), null);
    assert.notEqual(await service.consumeToken(second), null);
    assert.equal(await service.consumeToken(second), null);
  });
});
