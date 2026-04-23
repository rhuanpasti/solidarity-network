type ProgramKey = 'food-security' | 'school-support' | 'senior-care';
type BenefitKey =
  | 'monthly-food-basket'
  | 'fresh-produce-voucher'
  | 'school-supply-kit'
  | 'hygiene-kit'
  | 'prescription-support';
type AdministratorKey = 'system-root' | 'camila' | 'rafael' | 'marina';
type BeneficiaryKey =
  | 'ana-souza'
  | 'joao-santos'
  | 'maria-silva'
  | 'carlos-lima'
  | 'luciana-rocha';

interface DemoProgram {
  key: ProgramKey;
  name: string;
  description: string;
  status: 'active' | 'inactive';
}

interface DemoBenefit {
  key: BenefitKey;
  name: string;
  description: string;
  category: 'food' | 'education' | 'hygiene' | 'medicine';
  active: boolean;
}

interface DemoAdministrator {
  key: AdministratorKey;
  name: string;
  email: string;
  phone: string;
  role: 'super_admin' | 'program_manager' | 'case_worker';
  isSystemRoot: boolean;
  programKeys: ProgramKey[];
}

interface DemoBeneficiary {
  key: BeneficiaryKey;
  fullName: string;
  document: string;
  birthDate: string;
  email?: string;
  phone: string;
  status: 'active' | 'inactive';
  address: {
    street: string;
    number: string;
    district: string;
    city: string;
    state: string;
    postalCode: string;
    complement?: string;
  };
  notes: string;
  programKeys: ProgramKey[];
}

interface DemoDelivery {
  reference: string;
  beneficiaryKey: BeneficiaryKey;
  benefitKey: BenefitKey;
  programKey: ProgramKey;
  administratorKey: AdministratorKey;
  quantity: number;
  deliveredDaysAgo: number;
  notes: string;
}

export interface DemoSeedData {
  programs: DemoProgram[];
  benefits: DemoBenefit[];
  administrators: DemoAdministrator[];
  beneficiaries: DemoBeneficiary[];
  deliveries: Array<DemoDelivery & { deliveryDate: Date }>;
}

const programs: DemoProgram[] = [
  {
    key: 'food-security',
    name: 'Family Food Security',
    description:
      'Monthly support for households facing unstable income, with staple food baskets and produce vouchers.',
    status: 'active',
  },
  {
    key: 'school-support',
    name: 'Back to School Pathways',
    description:
      'Educational support for school-aged beneficiaries, including supplies and attendance follow-up.',
    status: 'active',
  },
  {
    key: 'senior-care',
    name: 'Senior Care at Home',
    description:
      'Home-based support for older adults with chronic health needs, medication access, and hygiene essentials.',
    status: 'active',
  },
];

const benefits: DemoBenefit[] = [
  {
    key: 'monthly-food-basket',
    name: 'Monthly Food Basket',
    description:
      'Staple groceries sized for households needing immediate food security support.',
    category: 'food',
    active: true,
  },
  {
    key: 'fresh-produce-voucher',
    name: 'Fresh Produce Voucher',
    description:
      'Voucher to complement monthly baskets with fruit, vegetables, and proteins from local markets.',
    category: 'food',
    active: true,
  },
  {
    key: 'school-supply-kit',
    name: 'School Supply Kit',
    description:
      'Notebook, backpack, pens, and study materials for students enrolled in the school support program.',
    category: 'education',
    active: true,
  },
  {
    key: 'hygiene-kit',
    name: 'Hygiene Kit',
    description:
      'Soap, shampoo, toothbrushes, sanitary items, and cleaning basics for vulnerable households.',
    category: 'hygiene',
    active: true,
  },
  {
    key: 'prescription-support',
    name: 'Prescription Support',
    description:
      'Medication assistance for beneficiaries managing chronic treatment plans.',
    category: 'medicine',
    active: true,
  },
];

const administrators: DemoAdministrator[] = [
  {
    key: 'system-root',
    name: 'System Administrator',
    email: 'admin@solidarity-network.local',
    phone: '+55 11 98888-0000',
    role: 'super_admin',
    isSystemRoot: true,
    programKeys: programs.map((program) => program.key),
  },
  {
    key: 'camila',
    name: 'Camila Ferreira',
    email: 'camila.ferreira@solidarity-network.local',
    phone: '+55 11 97770-4101',
    role: 'program_manager',
    isSystemRoot: false,
    programKeys: ['food-security', 'school-support'],
  },
  {
    key: 'rafael',
    name: 'Rafael Gomes',
    email: 'rafael.gomes@solidarity-network.local',
    phone: '+55 11 97770-4102',
    role: 'case_worker',
    isSystemRoot: false,
    programKeys: ['food-security', 'senior-care'],
  },
  {
    key: 'marina',
    name: 'Marina Costa',
    email: 'marina.costa@solidarity-network.local',
    phone: '+55 11 97770-4103',
    role: 'case_worker',
    isSystemRoot: false,
    programKeys: ['school-support', 'senior-care'],
  },
];

const beneficiaries: DemoBeneficiary[] = [
  {
    key: 'ana-souza',
    fullName: 'Ana Carolina Souza',
    document: '52998224725',
    birthDate: '1991-02-14',
    email: 'ana.souza@example.org',
    phone: '+55 11 96540-1101',
    status: 'active',
    address: {
      street: 'Rua das Palmeiras',
      number: '145',
      district: 'Jardim Helena',
      city: 'Sao Paulo',
      state: 'SP',
      postalCode: '08090-020',
      complement: 'Casa 2',
    },
    notes:
      'Single mother of two children, working part-time as a cleaner. Prioritizes food support and school stability for her family.',
    programKeys: ['food-security', 'school-support'],
  },
  {
    key: 'joao-santos',
    fullName: 'Joao Pedro Santos',
    document: '39053344705',
    birthDate: '2009-08-21',
    phone: '+55 11 96420-1102',
    status: 'active',
    address: {
      street: 'Travessa Esperanca',
      number: '32',
      district: 'Vila Brasilandia',
      city: 'Sao Paulo',
      state: 'SP',
      postalCode: '02851-130',
    },
    notes:
      'Teenager in high school with strong attendance, enrolled through his family household for educational support and food supplementation.',
    programKeys: ['food-security', 'school-support'],
  },
  {
    key: 'maria-silva',
    fullName: 'Maria Aparecida Silva',
    document: '28625587887',
    birthDate: '1957-06-03',
    email: 'maria.aparecida@example.org',
    phone: '+55 11 96310-1103',
    status: 'active',
    address: {
      street: 'Rua Jose Bonifacio',
      number: '908',
      district: 'Centro',
      city: 'Guarulhos',
      state: 'SP',
      postalCode: '07010-010',
      complement: 'Apto 14',
    },
    notes:
      'Widowed beneficiary with diabetes and hypertension, living alone and receiving home-based follow-up for medication adherence.',
    programKeys: ['senior-care', 'food-security'],
  },
  {
    key: 'carlos-lima',
    fullName: 'Carlos Henrique Lima',
    document: '84434843003',
    birthDate: '1983-11-29',
    email: 'carlos.lima@example.org',
    phone: '+55 11 96200-1104',
    status: 'active',
    address: {
      street: 'Avenida dos Trabalhadores',
      number: '201',
      district: 'Cidade Tiradentes',
      city: 'Sao Paulo',
      state: 'SP',
      postalCode: '08475-000',
    },
    notes:
      'Recently moved from temporary shelter to rented housing. Receiving short-term support while stabilizing employment and household supplies.',
    programKeys: ['food-security'],
  },
  {
    key: 'luciana-rocha',
    fullName: 'Luciana Rocha',
    document: '11811005030',
    birthDate: '1979-04-10',
    phone: '+55 11 96100-1105',
    status: 'inactive',
    address: {
      street: 'Rua do Rosario',
      number: '77',
      district: 'Parque das Nacoes',
      city: 'Santo Andre',
      state: 'SP',
      postalCode: '09280-100',
    },
    notes:
      'Former participant who completed the school support cycle for her children and is kept as inactive history for reporting and follow-up.',
    programKeys: ['school-support'],
  },
];

const deliveryTemplates: DemoDelivery[] = [
  {
    reference: 'DEMO-DEL-001',
    beneficiaryKey: 'ana-souza',
    benefitKey: 'monthly-food-basket',
    programKey: 'food-security',
    administratorKey: 'camila',
    quantity: 1,
    deliveredDaysAgo: 90,
    notes: 'Quarter start household support after rent increase.',
  },
  {
    reference: 'DEMO-DEL-002',
    beneficiaryKey: 'ana-souza',
    benefitKey: 'hygiene-kit',
    programKey: 'food-security',
    administratorKey: 'rafael',
    quantity: 1,
    deliveredDaysAgo: 58,
    notes: 'Added hygiene reinforcement for school-aged children at home.',
  },
  {
    reference: 'DEMO-DEL-003',
    beneficiaryKey: 'ana-souza',
    benefitKey: 'school-supply-kit',
    programKey: 'school-support',
    administratorKey: 'camila',
    quantity: 2,
    deliveredDaysAgo: 32,
    notes: 'Delivered two kits for the new school term.',
  },
  {
    reference: 'DEMO-DEL-004',
    beneficiaryKey: 'joao-santos',
    benefitKey: 'school-supply-kit',
    programKey: 'school-support',
    administratorKey: 'marina',
    quantity: 1,
    deliveredDaysAgo: 67,
    notes: 'Backpack and notebooks delivered before midterm period.',
  },
  {
    reference: 'DEMO-DEL-005',
    beneficiaryKey: 'joao-santos',
    benefitKey: 'fresh-produce-voucher',
    programKey: 'food-security',
    administratorKey: 'camila',
    quantity: 1,
    deliveredDaysAgo: 21,
    notes: 'Voucher issued after nutrition follow-up with the family.',
  },
  {
    reference: 'DEMO-DEL-006',
    beneficiaryKey: 'maria-silva',
    benefitKey: 'prescription-support',
    programKey: 'senior-care',
    administratorKey: 'marina',
    quantity: 1,
    deliveredDaysAgo: 76,
    notes: 'Medication support for diabetes and hypertension treatment.',
  },
  {
    reference: 'DEMO-DEL-007',
    beneficiaryKey: 'maria-silva',
    benefitKey: 'hygiene-kit',
    programKey: 'senior-care',
    administratorKey: 'rafael',
    quantity: 1,
    deliveredDaysAgo: 41,
    notes: 'Home delivery with personal care items and cleaning basics.',
  },
  {
    reference: 'DEMO-DEL-008',
    beneficiaryKey: 'maria-silva',
    benefitKey: 'monthly-food-basket',
    programKey: 'food-security',
    administratorKey: 'rafael',
    quantity: 1,
    deliveredDaysAgo: 12,
    notes: 'Monthly basket delivered during home visit.',
  },
  {
    reference: 'DEMO-DEL-009',
    beneficiaryKey: 'carlos-lima',
    benefitKey: 'monthly-food-basket',
    programKey: 'food-security',
    administratorKey: 'rafael',
    quantity: 1,
    deliveredDaysAgo: 49,
    notes: 'Initial support after move from temporary shelter.',
  },
  {
    reference: 'DEMO-DEL-010',
    beneficiaryKey: 'carlos-lima',
    benefitKey: 'fresh-produce-voucher',
    programKey: 'food-security',
    administratorKey: 'camila',
    quantity: 1,
    deliveredDaysAgo: 15,
    notes: 'Voucher delivered after first salary gap assessment.',
  },
];

export function buildDemoSeedData(referenceDate = new Date()): DemoSeedData {
  return {
    programs,
    benefits,
    administrators,
    beneficiaries,
    deliveries: deliveryTemplates.map((delivery) => ({
      ...delivery,
      deliveryDate: daysAgo(referenceDate, delivery.deliveredDaysAgo),
    })),
  };
}

function daysAgo(referenceDate: Date, value: number) {
  const date = new Date(referenceDate);
  date.setUTCHours(14, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - value);
  return date;
}
