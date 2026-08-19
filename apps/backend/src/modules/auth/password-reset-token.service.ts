import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import type { AccountType } from '@solidarity-network/shared';
import type { AppEnvironment } from '../../config/env.schema';
import { PrismaService } from '../../prisma/prisma.service';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export interface PasswordResetTokenPayload {
  accountId: string;
  accountType: AccountType;
  email: string;
}

@Injectable()
export class PasswordResetTokenService {
  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService<AppEnvironment>,
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async createToken(payload: PasswordResetTokenPayload) {
    const token = randomBytes(32).toString('base64url');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + RESET_TOKEN_TTL_MS);

    await this.prisma.passwordResetToken.updateMany({
      where: {
        accountId: payload.accountId,
        accountType: payload.accountType,
        usedAt: null,
      },
      data: { usedAt: now },
    });
    await this.prisma.passwordResetToken.deleteMany({
      where: { expiresAt: { lt: now } },
    });
    await this.prisma.passwordResetToken.create({
      data: {
        tokenHash: this.hashToken(token),
        accountId: payload.accountId,
        accountType: payload.accountType,
        email: payload.email,
        expiresAt,
      },
    });

    return token;
  }

  async verifyToken(token: string): Promise<PasswordResetTokenPayload | null> {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: this.hashToken(token) },
    });

    if (!record || record.usedAt || record.expiresAt <= new Date()) {
      return null;
    }

    return this.toPayload(record);
  }

  async consumeToken(token: string): Promise<PasswordResetTokenPayload | null> {
    const tokenHash = this.hashToken(token);
    const now = new Date();
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!record || record.usedAt || record.expiresAt <= now) {
      return null;
    }

    const consumed = await this.prisma.passwordResetToken.updateMany({
      where: {
        id: record.id,
        usedAt: null,
        expiresAt: { gt: now },
      },
      data: { usedAt: now },
    });

    return consumed.count === 1 ? this.toPayload(record) : null;
  }

  async invalidateForAccount(accountType: AccountType, accountId: string) {
    await this.prisma.passwordResetToken.updateMany({
      where: { accountType, accountId, usedAt: null },
      data: { usedAt: new Date() },
    });
  }

  buildResetLink(token: string) {
    const publicUrl = this.configService.get('APP_PUBLIC_URL', { infer: true });
    const resetPath = this.configService.get('PASSWORD_RESET_PATH', { infer: true });
    const url = new URL(
      resetPath ?? '/reset-password',
      publicUrl ?? 'http://localhost:4200',
    );
    url.searchParams.set('token', token);

    return url.toString();
  }

  getExpiresInLabel() {
    return '1 hour';
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private toPayload(record: {
    accountId: string;
    accountType: string;
    email: string;
  }): PasswordResetTokenPayload | null {
    if (record.accountType !== 'administrator' && record.accountType !== 'beneficiary') {
      return null;
    }

    return {
      accountId: record.accountId,
      accountType: record.accountType,
      email: record.email,
    };
  }
}
