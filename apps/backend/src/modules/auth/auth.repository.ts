import { Inject, Injectable } from '@nestjs/common';
import type { AccountType } from '@solidarity-network/shared';
import type { AdministratorRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuthAccountRecord {
  id: string;
  username: string;
  name: string;
  email: string;
  role: AdministratorRole | null;
  accountType: AccountType;
  passwordHash: string;
  mustChangePassword: boolean;
}

@Injectable()
export class AuthRepository {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async findCredentialByIdentifier(
    identifier: string,
  ): Promise<AuthAccountRecord | null> {
    const administratorCredential = await this.prisma.authCredential.findFirst({
      where: {
        OR: [
          { username: { equals: identifier, mode: 'insensitive' } },
          { administrator: { email: { equals: identifier, mode: 'insensitive' } } },
        ],
      },
      include: {
        administrator: true,
      },
    });

    if (administratorCredential) {
      return {
        id: administratorCredential.administrator.id,
        username: administratorCredential.username,
        name: administratorCredential.administrator.name,
        email: administratorCredential.administrator.email,
        role: administratorCredential.administrator.role,
        accountType: 'administrator',
        passwordHash: administratorCredential.passwordHash,
        mustChangePassword: administratorCredential.mustChangePassword,
      };
    }

    const beneficiary = await this.prisma.beneficiary.findFirst({
      where: {
        email: { equals: identifier, mode: 'insensitive' },
        passwordHash: { not: null },
      },
      include: {
        charityProgram: true,
      },
    });

    if (!beneficiary?.email || !beneficiary.passwordHash) {
      return null;
    }

    return {
      id: beneficiary.id,
      username: beneficiary.email,
      name: beneficiary.fullName,
      email: beneficiary.email,
      role: null,
      accountType: 'beneficiary',
      passwordHash: beneficiary.passwordHash,
      mustChangePassword: beneficiary.mustChangePassword,
    };
  }

  async findCredentialByAccount(
    accountType: AccountType,
    accountId: string,
  ): Promise<AuthAccountRecord | null> {
    if (accountType === 'administrator') {
      const credential = await this.prisma.authCredential.findUnique({
        where: { administratorId: accountId },
        include: {
          administrator: true,
        },
      });

      if (!credential) {
        return null;
      }

      return {
        id: credential.administrator.id,
        username: credential.username,
        name: credential.administrator.name,
        email: credential.administrator.email,
        role: credential.administrator.role,
        accountType,
        passwordHash: credential.passwordHash,
        mustChangePassword: credential.mustChangePassword,
      };
    }

    const beneficiary = await this.prisma.beneficiary.findUnique({
      where: { id: accountId },
    });

    if (!beneficiary?.email || !beneficiary.passwordHash) {
      return null;
    }

    return {
      id: beneficiary.id,
      username: beneficiary.email,
      name: beneficiary.fullName,
      email: beneficiary.email,
      role: null,
      accountType,
      passwordHash: beneficiary.passwordHash,
      mustChangePassword: beneficiary.mustChangePassword,
    };
  }

  async updatePassword(
    accountType: AccountType,
    accountId: string,
    passwordHash: string,
  ): Promise<AuthAccountRecord> {
    if (accountType === 'administrator') {
      const credential = await this.prisma.authCredential.update({
        where: { administratorId: accountId },
        data: {
          passwordHash,
          mustChangePassword: false,
          lastPasswordChangedAt: new Date(),
        },
        include: {
          administrator: true,
        },
      });

      return {
        id: credential.administrator.id,
        username: credential.username,
        name: credential.administrator.name,
        email: credential.administrator.email,
        role: credential.administrator.role,
        accountType,
        passwordHash: credential.passwordHash,
        mustChangePassword: credential.mustChangePassword,
      };
    }

    const beneficiary = await this.prisma.beneficiary.update({
      where: { id: accountId },
      data: {
        passwordHash,
        mustChangePassword: false,
        lastPasswordChangedAt: new Date(),
      },
    });

    if (!beneficiary.email) {
      throw new Error('Beneficiary email is required to update password.');
    }

    return {
      id: beneficiary.id,
      username: beneficiary.email,
      name: beneficiary.fullName,
      email: beneficiary.email,
      role: null,
      accountType,
      passwordHash: beneficiary.passwordHash ?? passwordHash,
      mustChangePassword: beneficiary.mustChangePassword,
    };
  }
}
