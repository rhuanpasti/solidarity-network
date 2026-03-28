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

  const program = await prisma.charityProgram.upsert({
    where: { id: 'program-food-security' },
    update: {},
    create: {
      id: 'program-food-security',
      name: 'Food Security Program',
      description: 'Distributes essential resources to families in vulnerable situations.',
      status: 'active',
    },
  });

  const administrator = await prisma.administrator.upsert({
    where: { email: seedAdminEmail },
    update: {
      name: 'System Administrator',
      phone: '+55 11 98888-0000',
      role: 'super_admin',
    },
    create: {
      name: 'System Administrator',
      email: seedAdminEmail,
      phone: '+55 11 98888-0000',
      role: 'super_admin',
      charityPrograms: {
        create: {
          charityProgramId: program.id,
        },
      },
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

  const benefit = await prisma.benefit.upsert({
    where: { id: 'benefit-basic-food-basket' },
    update: {},
    create: {
      id: 'benefit-basic-food-basket',
      name: 'Basic Food Basket',
      description: 'Monthly food basket for registered families.',
      category: 'food',
      active: true,
    },
  });

  const beneficiary = await prisma.beneficiary.upsert({
    where: { document: '123.456.789-00' },
    update: {},
    create: {
      fullName: 'Maria Silva',
      document: '123.456.789-00',
      birthDate: new Date('1990-05-10'),
      phone: '+55 11 97777-0000',
      address: {
        street: 'Rua das Flores',
        number: '100',
        district: 'Centro',
        city: 'Sao Paulo',
        state: 'SP',
        postalCode: '01000-000',
        country: 'Brazil',
      },
      notes: 'Prefers morning visits.',
      charityProgramId: program.id,
      status: 'active',
    },
  });

  await prisma.benefitDelivery.upsert({
    where: { reference: 'DEL-2026-0001' },
    update: {},
    create: {
      beneficiaryId: beneficiary.id,
      benefitId: benefit.id,
      charityProgramId: program.id,
      administratorId: administrator.id,
      quantity: 1,
      deliveryDate: new Date(),
      notes: 'Initial seeded delivery.',
      reference: 'DEL-2026-0001',
    },
  });
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
