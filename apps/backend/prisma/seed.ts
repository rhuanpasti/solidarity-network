import { existsSync } from 'node:fs';
import process from 'node:process';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/modules/auth/password.util';

const prisma = new PrismaClient();
const envFilePath = resolve(process.cwd(), '.env');

if (existsSync(envFilePath)) {
  process.loadEnvFile(envFilePath);
}

async function main() {
  const seedAdminEmail =
    process.env.SEED_ADMIN_EMAIL?.trim() || 'admin@solidarity-network.local';
  const seedAdminUsername = process.env.SEED_ADMIN_USERNAME?.trim();
  const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD?.trim();

  if (Boolean(seedAdminUsername) !== Boolean(seedAdminPassword)) {
    throw new Error(
      'Set both SEED_ADMIN_USERNAME and SEED_ADMIN_PASSWORD or leave both empty.',
    );
  }

  if (seedAdminPassword && seedAdminPassword.length < 12) {
    throw new Error(
      'SEED_ADMIN_PASSWORD must contain at least 12 characters.',
    );
  }

  const administrator = await prisma.administrator.upsert({
    where: { email: seedAdminEmail },
    update: {
      name: 'System Administrator',
      phone: '+55 11 98888-0000',
      role: 'super_admin',
      isSystemRoot: true,
    },
    create: {
      name: 'System Administrator',
      email: seedAdminEmail,
      phone: '+55 11 98888-0000',
      role: 'super_admin',
      isSystemRoot: true,
    },
  });

  if (seedAdminUsername && seedAdminPassword) {
    await prisma.authCredential.upsert({
      where: { username: seedAdminUsername },
      update: {
        administratorId: administrator.id,
        passwordHash: await hashPassword(seedAdminPassword),
        mustChangePassword: true,
      },
      create: {
        administratorId: administrator.id,
        username: seedAdminUsername,
        passwordHash: await hashPassword(seedAdminPassword),
        mustChangePassword: true,
      },
    });
  } else {
    console.warn(
      'Skipping seeded auth credential. Set SEED_ADMIN_USERNAME and SEED_ADMIN_PASSWORD to create an administrator login.',
    );
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
