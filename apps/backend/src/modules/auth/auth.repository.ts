import { Inject, Injectable } from '@nestjs/common';
import type { AccountType } from '@solidarity-network/shared';
import type { AdministratorRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from './auth.types';

export interface AuthAccountRecord {
  id: string;
  username: string;
  name: string;
  email: string;
  role: AdministratorRole | null;
  accountType: AccountType;
  programIds: string[];
  passwordHash: string;
  mustChangePassword: boolean;
}

@Injectable()
export class AuthRepository {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async findCredentialsByIdentifier(
    identifier: string,
  ): Promise<AuthAccountRecord[]> {
    const [administratorCredentials, beneficiary] = await Promise.all([
      this.prisma.authCredential.findMany({
        where: {
          OR: [
            { username: { equals: identifier, mode: 'insensitive' } },
            { administrator: { email: { equals: identifier, mode: 'insensitive' } } },
          ],
        },
        include: {
          administrator: {
            include: {
              charityPrograms: true,
            },
          },
        },
      }),
      this.prisma.beneficiary.findFirst({
        where: {
          email: { equals: identifier, mode: 'insensitive' },
          passwordHash: { not: null },
          status: 'active',
        },
        include: {
          charityPrograms: true,
        },
      }),
    ]);

    const credentials: AuthAccountRecord[] = administratorCredentials.map((credential) => ({
      id: credential.administrator.id,
      username: credential.username,
      name: credential.administrator.name,
      email: credential.administrator.email,
      role: credential.administrator.role,
      accountType: 'administrator',
      programIds: credential.administrator.charityPrograms.map(
        (link) => link.charityProgramId,
      ),
      passwordHash: credential.passwordHash,
      mustChangePassword: credential.mustChangePassword,
    }));

    if (beneficiary?.email && beneficiary.passwordHash) {
      credentials.push({
        id: beneficiary.id,
        username: beneficiary.email,
        name: beneficiary.fullName,
        email: beneficiary.email,
        role: null,
        accountType: 'beneficiary',
        programIds: beneficiary.charityPrograms.map((link) => link.charityProgramId),
        passwordHash: beneficiary.passwordHash,
        mustChangePassword: beneficiary.mustChangePassword,
      });
    }

    return credentials;
  }

  async findAuthenticatedUser(
    accountType: AccountType,
    accountId: string,
  ): Promise<Omit<AuthenticatedUser, 'iat' | 'exp'> | null> {
    if (accountType === 'administrator') {
      const credential = await this.prisma.authCredential.findUnique({
        where: { administratorId: accountId },
        include: {
          administrator: {
            include: {
              charityPrograms: true,
            },
          },
        },
      });

      if (!credential) {
        return null;
      }

      return {
        sub: credential.administrator.id,
        username: credential.username,
        name: credential.administrator.name,
        email: credential.administrator.email,
        role: credential.administrator.role,
        accountType,
        programIds: credential.administrator.charityPrograms.map(
          (link) => link.charityProgramId,
        ),
        mustChangePassword: credential.mustChangePassword,
        csrfToken: '',
      };
    }

    const beneficiary = await this.prisma.beneficiary.findUnique({
      where: { id: accountId },
      include: {
        charityPrograms: true,
      },
    });

    if (
      !beneficiary?.email ||
      !beneficiary.passwordHash ||
      beneficiary.status !== 'active'
    ) {
      return null;
    }

    return {
      sub: beneficiary.id,
      username: beneficiary.email,
      name: beneficiary.fullName,
      email: beneficiary.email,
      role: null,
      accountType,
      programIds: beneficiary.charityPrograms.map((link) => link.charityProgramId),
      mustChangePassword: beneficiary.mustChangePassword,
      csrfToken: '',
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
          administrator: {
            include: {
              charityPrograms: true,
            },
          },
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
        programIds: credential.administrator.charityPrograms.map(
          (link) => link.charityProgramId,
        ),
        passwordHash: credential.passwordHash,
        mustChangePassword: credential.mustChangePassword,
      };
    }

    const beneficiary = await this.prisma.beneficiary.findUnique({
      where: { id: accountId },
      include: {
        charityPrograms: true,
      },
    });

    if (
      !beneficiary?.email ||
      !beneficiary.passwordHash ||
      beneficiary.status !== 'active'
    ) {
      return null;
    }

    return {
      id: beneficiary.id,
      username: beneficiary.email,
      name: beneficiary.fullName,
      email: beneficiary.email,
      role: null,
      accountType,
      programIds: beneficiary.charityPrograms.map((link) => link.charityProgramId),
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
          administrator: {
            include: {
              charityPrograms: true,
            },
          },
        },
      });

      return {
        id: credential.administrator.id,
        username: credential.username,
        name: credential.administrator.name,
        email: credential.administrator.email,
        role: credential.administrator.role,
        accountType,
        programIds: credential.administrator.charityPrograms.map(
          (link) => link.charityProgramId,
        ),
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
      include: {
        charityPrograms: true,
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
      programIds: beneficiary.charityPrograms.map((link) => link.charityProgramId),
      passwordHash: beneficiary.passwordHash ?? passwordHash,
      mustChangePassword: beneficiary.mustChangePassword,
    };
  }
}
