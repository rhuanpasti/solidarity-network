import { existsSync } from 'node:fs';
import process from 'node:process';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/modules/auth/password.util';
import { buildDemoSeedData } from './demo-seed-data';

const prisma = new PrismaClient();
const envFilePath = resolve(process.cwd(), '.env');

if (existsSync(envFilePath)) {
  process.loadEnvFile(envFilePath);
}

async function main() {
  const demoData = buildDemoSeedData();
  const seedAdminEmail =
    process.env.SEED_ADMIN_EMAIL?.trim() || 'admin@solidarity-network.local';
  const seedAdminUsername = process.env.SEED_ADMIN_USERNAME?.trim();
  const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD?.trim();

  if (Boolean(seedAdminUsername) !== Boolean(seedAdminPassword)) {
    throw new Error(
      'Set both SEED_ADMIN_USERNAME and SEED_ADMIN_PASSWORD or leave both empty.',
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

  const programIds = new Map<string, string>();
  for (const program of demoData.programs) {
    const existing = await prisma.charityProgram.findFirst({
      where: { name: program.name },
      select: { id: true },
    });

    const savedProgram = existing
      ? await prisma.charityProgram.update({
          where: { id: existing.id },
          data: {
            description: program.description,
            status: program.status,
          },
        })
      : await prisma.charityProgram.create({
          data: {
            name: program.name,
            description: program.description,
            status: program.status,
          },
        });

    programIds.set(program.key, savedProgram.id);
  }

  const benefitIds = new Map<string, string>();
  for (const benefit of demoData.benefits) {
    const existing = await prisma.benefit.findFirst({
      where: { name: benefit.name },
      select: { id: true },
    });

    const savedBenefit = existing
      ? await prisma.benefit.update({
          where: { id: existing.id },
          data: {
            description: benefit.description,
            category: benefit.category,
            active: benefit.active,
          },
        })
      : await prisma.benefit.create({
          data: {
            name: benefit.name,
            description: benefit.description,
            category: benefit.category,
            active: benefit.active,
          },
        });

    benefitIds.set(benefit.key, savedBenefit.id);
  }

  const administratorIds = new Map<string, string>([['system-root', administrator.id]]);
  for (const seededAdministrator of demoData.administrators) {
    if (seededAdministrator.key === 'system-root') {
      continue;
    }

    const savedAdministrator = await prisma.administrator.upsert({
      where: { email: seededAdministrator.email },
      update: {
        name: seededAdministrator.name,
        phone: seededAdministrator.phone,
        role: seededAdministrator.role,
        isSystemRoot: seededAdministrator.isSystemRoot,
      },
      create: {
        name: seededAdministrator.name,
        email: seededAdministrator.email,
        phone: seededAdministrator.phone,
        role: seededAdministrator.role,
        isSystemRoot: seededAdministrator.isSystemRoot,
      },
    });

    administratorIds.set(seededAdministrator.key, savedAdministrator.id);
  }

  const beneficiaryIds = new Map<string, string>();
  for (const beneficiary of demoData.beneficiaries) {
    const savedBeneficiary = await prisma.beneficiary.upsert({
      where: { document: beneficiary.document },
      update: {
        fullName: beneficiary.fullName,
        birthDate: new Date(beneficiary.birthDate),
        email: beneficiary.email ?? null,
        phone: beneficiary.phone,
        address: beneficiary.address,
        notes: beneficiary.notes,
        status: beneficiary.status,
      },
      create: {
        fullName: beneficiary.fullName,
        document: beneficiary.document,
        birthDate: new Date(beneficiary.birthDate),
        email: beneficiary.email ?? null,
        phone: beneficiary.phone,
        address: beneficiary.address,
        notes: beneficiary.notes,
        status: beneficiary.status,
      },
    });

    beneficiaryIds.set(beneficiary.key, savedBeneficiary.id);
  }

  await prisma.administratorProgramLink.deleteMany({
    where: {
      administratorId: {
        in: Array.from(administratorIds.values()),
      },
    },
  });

  await prisma.administratorProgramLink.createMany({
    data: demoData.administrators.flatMap((seededAdministrator) =>
      seededAdministrator.programKeys.map((programKey) => ({
        administratorId: requiredId(administratorIds, seededAdministrator.key),
        charityProgramId: requiredId(programIds, programKey),
      })),
    ),
    skipDuplicates: true,
  });

  await prisma.beneficiaryProgramLink.deleteMany({
    where: {
      beneficiaryId: {
        in: Array.from(beneficiaryIds.values()),
      },
    },
  });

  await prisma.beneficiaryProgramLink.createMany({
    data: demoData.beneficiaries.flatMap((beneficiary) =>
      beneficiary.programKeys.map((programKey) => ({
        beneficiaryId: requiredId(beneficiaryIds, beneficiary.key),
        charityProgramId: requiredId(programIds, programKey),
      })),
    ),
    skipDuplicates: true,
  });

  await prisma.benefitDelivery.deleteMany({
    where: {
      reference: {
        in: demoData.deliveries.map((delivery) => delivery.reference),
      },
    },
  });

  await prisma.benefitDelivery.createMany({
    data: demoData.deliveries.map((delivery) => ({
      beneficiaryId: requiredId(beneficiaryIds, delivery.beneficiaryKey),
      benefitId: requiredId(benefitIds, delivery.benefitKey),
      charityProgramId: requiredId(programIds, delivery.programKey),
      administratorId: requiredId(administratorIds, delivery.administratorKey),
      quantity: delivery.quantity,
      deliveryDate: delivery.deliveryDate,
      notes: delivery.notes,
      reference: delivery.reference,
    })),
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

  console.log(
    [
      `Seeded ${demoData.programs.length} programs`,
      `${demoData.benefits.length} benefits`,
      `${demoData.beneficiaries.length} beneficiaries`,
      `${demoData.deliveries.length} delivery records`,
    ].join(', '),
  );
}

function requiredId(ids: Map<string, string>, key: string) {
  const value = ids.get(key);

  if (!value) {
    throw new Error(`Missing seeded id for ${key}.`);
  }

  return value;
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
