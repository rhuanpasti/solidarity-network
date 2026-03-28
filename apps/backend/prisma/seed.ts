import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
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
    where: { email: 'admin@solidarity-network.local' },
    update: {},
    create: {
      name: 'Alice Johnson',
      email: 'admin@solidarity-network.local',
      phone: '+55 11 98888-0000',
      role: 'super_admin',
      charityPrograms: {
        create: {
          charityProgramId: program.id,
        },
      },
    },
  });

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

