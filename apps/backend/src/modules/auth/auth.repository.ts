import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthRepository {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  findCredentialByIdentifier(identifier: string) {
    return this.prisma.authCredential.findFirst({
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
  }

  findCredentialByAdministratorId(administratorId: string) {
    return this.prisma.authCredential.findUnique({
      where: { administratorId },
      include: {
        administrator: true,
      },
    });
  }

  updatePassword(administratorId: string, passwordHash: string) {
    return this.prisma.authCredential.update({
      where: { administratorId },
      data: {
        passwordHash,
        mustChangePassword: false,
        lastPasswordChangedAt: new Date(),
      },
      include: {
        administrator: true,
      },
    });
  }
}
