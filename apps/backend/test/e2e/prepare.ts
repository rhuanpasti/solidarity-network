import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../../src/modules/auth/password.util';

const prisma = new PrismaClient();
const password = process.env.E2E_PASSWORD;

const administratorCredentials = [
  {
    email: 'admin@solidarity-network.local',
    username: 'e2e-root',
  },
  {
    email: 'camila.ferreira@solidarity-network.local',
    username: 'e2e-manager',
  },
  {
    email: 'rafael.gomes@solidarity-network.local',
    username: 'e2e-worker',
  },
];

async function main() {
  if (!password) {
    throw new Error('Set E2E_PASSWORD through the environment before preparing E2E credentials.');
  }

  const passwordHash = await hashPassword(password);

  for (const account of administratorCredentials) {
    const administrator = await prisma.administrator.findUniqueOrThrow({
      where: { email: account.email },
    });

    await prisma.authCredential.upsert({
      where: { administratorId: administrator.id },
      update: {
        username: account.username,
        passwordHash,
        mustChangePassword: false,
      },
      create: {
        administratorId: administrator.id,
        username: account.username,
        passwordHash,
        mustChangePassword: false,
      },
    });
  }

  const beneficiary = await prisma.beneficiary.findUniqueOrThrow({
    where: { email: 'ana.souza@example.org' },
  });

  await prisma.beneficiary.update({
    where: { id: beneficiary.id },
    data: {
      passwordHash,
      mustChangePassword: false,
      status: 'active',
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
