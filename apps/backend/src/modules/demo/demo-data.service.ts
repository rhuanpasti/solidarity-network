import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  Address,
  AdministratorSummary,
  BeneficiaryListQuery,
  BeneficiarySummary,
  BenefitDeliveryListQuery,
  BenefitDeliverySummary,
  BenefitSummary,
  CharityProgramListQuery,
  CharityProgramSummary,
  CreateAdministratorResult,
  CreateBeneficiaryResult,
  ListQuery,
  PaginatedResponse,
} from '@solidarity-network/shared';
import type { AdministratorRole, BeneficiaryStatus, BenefitCategory, CharityProgramStatus } from '@solidarity-network/shared';
import type { AppEnvironment } from '../../config/env.schema';
import { buildDemoSeedData } from '../../../prisma/demo-seed-data';

const DEMO_USER_ID = 'demo-user';
const DEMO_TIMESTAMP = '2026-01-01T12:00:00.000Z';
const DEMO_PREVIEW_DOCUMENT = '00000000000';
const DEMO_PREVIEW_PHONE = '999999999';

@Injectable()
export class DemoDataService {
  private readonly seed = buildDemoSeedData(new Date(DEMO_TIMESTAMP));
  private readonly programs: CharityProgramSummary[];
  private readonly benefits: BenefitSummary[];
  private readonly administrators: AdministratorSummary[];
  private readonly beneficiaries: BeneficiarySummary[];
  private readonly deliveries: BenefitDeliverySummary[];

  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService<AppEnvironment>,
  ) {
    this.programs = this.seed.programs.map((program) => ({
      id: this.programId(program.key),
      name: program.name,
      description: program.description,
      status: program.status as CharityProgramStatus,
      createdAt: DEMO_TIMESTAMP,
      updatedAt: DEMO_TIMESTAMP,
    }));
    this.benefits = this.seed.benefits.map((benefit) => ({
      id: this.benefitId(benefit.key),
      name: benefit.name,
      description: benefit.description,
      category: benefit.category as BenefitCategory,
      active: benefit.active,
      createdAt: DEMO_TIMESTAMP,
      updatedAt: DEMO_TIMESTAMP,
    }));
    this.administrators = this.seed.administrators.map((administrator) => ({
      id: this.administratorId(administrator.key),
      name: administrator.name,
      email: administrator.email,
      phone: administrator.phone,
      role: administrator.role as AdministratorRole,
      charityPrograms: administrator.programKeys
        .map((key) => this.programs.find((program) => program.id === this.programId(key)))
        .filter((program): program is CharityProgramSummary => Boolean(program)),
      createdAt: DEMO_TIMESTAMP,
      updatedAt: DEMO_TIMESTAMP,
    }));
    this.beneficiaries = this.seed.beneficiaries.map((beneficiary) => ({
      id: this.beneficiaryId(beneficiary.key),
      fullName: beneficiary.fullName,
      document: beneficiary.document,
      birthDate: new Date(beneficiary.birthDate).toISOString(),
      email: beneficiary.email ?? null,
      phone: beneficiary.phone,
      address: {
        ...beneficiary.address,
        country: 'Brazil',
      } satisfies Address,
      notes: beneficiary.notes,
      dependents: [],
      charityPrograms: beneficiary.programKeys
        .map((key) => this.programs.find((program) => program.id === this.programId(key)))
        .filter((program): program is CharityProgramSummary => Boolean(program)),
      createdAt: DEMO_TIMESTAMP,
      status: beneficiary.status as BeneficiaryStatus,
    }));
    this.deliveries = this.seed.deliveries.map((delivery) => {
      const beneficiary = this.beneficiaries.find(
        (item) => item.id === this.beneficiaryId(delivery.beneficiaryKey),
      )!;
      const benefit = this.benefits.find(
        (item) => item.id === this.benefitId(delivery.benefitKey),
      )!;
      const charityProgram = this.programs.find(
        (item) => item.id === this.programId(delivery.programKey),
      )!;
      const administrator = this.administrators.find(
        (item) => item.id === this.administratorId(delivery.administratorKey),
      )!;

      return {
        id: `demo-delivery-${delivery.reference.toLowerCase()}`,
        beneficiary: {
          id: beneficiary.id,
          fullName: beneficiary.fullName,
          document: beneficiary.document,
        },
        benefit: {
          id: benefit.id,
          name: benefit.name,
          category: benefit.category,
        },
        charityProgram: {
          id: charityProgram.id,
          name: charityProgram.name,
          status: charityProgram.status,
        },
        quantity: delivery.quantity,
        deliveryDate: delivery.deliveryDate.toISOString(),
        notes: delivery.notes,
        administrator: {
          id: administrator.id,
          name: administrator.name,
          email: administrator.email,
          role: administrator.role,
        },
        reference: delivery.reference,
        createdAt: DEMO_TIMESTAMP,
      };
    });
  }

  isEnabled() {
    return this.configService.get('DEMO_MODE', { infer: true }) === true;
  }

  authenticate(identifier: string, password: string) {
    if (
      !this.isEnabled() ||
      ![this.demoUsername(), this.demoEmail()].includes(identifier.trim().toLowerCase()) ||
      password !== this.demoPassword()
    ) {
      return null;
    }

    return {
      sub: DEMO_USER_ID,
      username: this.demoUsername(),
      name: 'Demo Administrator',
      email: this.demoEmail(),
      role: 'super_admin' as const,
      accountType: 'administrator' as const,
      programIds: this.programs.map((program) => program.id),
      mustChangePassword: false,
      sessionVersion: 0,
      isDemo: true,
    };
  }

  isDemoUser(user: { isDemo?: boolean }) {
    return user.isDemo === true;
  }

  metrics() {
    return {
      programs: this.programs.length,
      beneficiaries: this.beneficiaries.length,
      deliveries: this.deliveries.length,
    };
  }

  demoEmail() {
    return this.configService.get('DEMO_USER_EMAIL', { infer: true }) ?? 'demo@solidarity-network.local';
  }

  demoUsername() {
    return this.configService.get('DEMO_USER_USERNAME', { infer: true }) ?? 'demo-user';
  }

  demoPassword() {
    return this.configService.get('DEMO_USER_PASSWORD', { infer: true }) ?? 'demo-user-2026';
  }

  listPrograms(query: CharityProgramListQuery) {
    return this.paginate(
      this.programs.filter((program) =>
        (!query.status || program.status === query.status) && this.matches(program, query.search),
      ),
      query,
    );
  }

  getProgram(id: string) {
    return this.programs.find((program) => program.id === id) ?? this.programs[0]!;
  }

  previewProgram(payload: { name: string; description: string; status: CharityProgramStatus }) {
    return {
      id: 'demo-preview-program',
      ...payload,
      createdAt: DEMO_TIMESTAMP,
      updatedAt: DEMO_TIMESTAMP,
    } satisfies CharityProgramSummary;
  }

  listBenefits(query: ListQuery) {
    return this.paginate(this.benefits.filter((benefit) => this.matches(benefit, query.search)), query);
  }

  getBenefit(id: string) {
    return this.benefits.find((benefit) => benefit.id === id) ?? this.benefits[0]!;
  }

  previewBenefit(payload: Pick<BenefitSummary, 'name' | 'description' | 'category' | 'active'>) {
    return { id: 'demo-preview-benefit', ...payload, createdAt: DEMO_TIMESTAMP, updatedAt: DEMO_TIMESTAMP } satisfies BenefitSummary;
  }

  listBeneficiaries(query: BeneficiaryListQuery) {
    return this.paginate(
      this.beneficiaries.filter((beneficiary) =>
        (!query.status || beneficiary.status === query.status) &&
        (!query.charityProgramId || beneficiary.charityPrograms.some((program) => program.id === query.charityProgramId)) &&
        this.matches(beneficiary, query.search),
      ),
      query,
    );
  }

  getBeneficiary(id: string) {
    return this.beneficiaries.find((beneficiary) => beneficiary.id === id) ?? this.beneficiaries[0]!;
  }

  previewBeneficiary(payload: {
    fullName: string;
    document: string;
    birthDate: string;
    email?: string;
    phone: string;
    address: Address;
    notes?: string | null;
    charityProgramIds?: string[];
    status: BeneficiaryStatus;
  }): CreateBeneficiaryResult {
    return {
      beneficiary: {
        id: 'demo-preview-beneficiary',
        fullName: payload.fullName,
        document: DEMO_PREVIEW_DOCUMENT,
        birthDate: payload.birthDate ? new Date(payload.birthDate).toISOString() : null,
        email: payload.email ?? null,
        phone: DEMO_PREVIEW_PHONE,
        address: payload.address,
        notes: payload.notes ?? null,
        dependents: [],
        charityPrograms: (payload.charityProgramIds ?? []).map((id) => this.getProgram(id)),
        createdAt: DEMO_TIMESTAMP,
        status: payload.status,
      },
      generatedPasskey: '0000000000000000',
    };
  }

  listDeliveries(query: BenefitDeliveryListQuery) {
    return this.paginate(
      this.deliveries.filter((delivery) =>
        (!query.beneficiaryId || delivery.beneficiary.id === query.beneficiaryId) &&
        (!query.charityProgramId || delivery.charityProgram.id === query.charityProgramId),
      ),
      query,
    );
  }

  getDelivery(id: string) {
    return this.deliveries.find((delivery) => delivery.id === id) ?? this.deliveries[0]!;
  }

  previewDelivery(payload: {
    beneficiaryId: string;
    benefitId: string;
    charityProgramId: string;
    quantity: number;
    deliveryDate: string;
    notes?: string | null;
    reference: string;
  }) {
    const beneficiary = this.getBeneficiary(payload.beneficiaryId);
    const benefit = this.getBenefit(payload.benefitId);
    const program = this.getProgram(payload.charityProgramId);

    return {
      id: 'demo-preview-delivery',
      beneficiary: { id: beneficiary.id, fullName: beneficiary.fullName, document: beneficiary.document },
      benefit: { id: benefit.id, name: benefit.name, category: benefit.category },
      charityProgram: { id: program.id, name: program.name, status: program.status },
      quantity: payload.quantity,
      deliveryDate: new Date(payload.deliveryDate).toISOString(),
      notes: payload.notes ?? null,
      administrator: {
        id: DEMO_USER_ID,
        name: 'Demo Administrator',
        email: this.demoEmail(),
        role: 'super_admin',
      },
      reference: payload.reference,
      createdAt: DEMO_TIMESTAMP,
    } satisfies BenefitDeliverySummary;
  }

  listAdministrators(query: ListQuery) {
    return this.paginate(this.administrators.filter((administrator) => this.matches(administrator, query.search)), query);
  }

  getAdministrator(id: string) {
    return this.administrators.find((administrator) => administrator.id === id) ?? this.administrators[0]!;
  }

  previewAdministrator(payload: {
    name: string;
    email: string;
    phone: string;
    role: AdministratorRole;
    charityProgramIds: string[];
  }): CreateAdministratorResult {
    return {
      administrator: {
        id: 'demo-preview-administrator',
        name: payload.name,
        email: payload.email,
        phone: DEMO_PREVIEW_PHONE,
        role: payload.role,
        charityPrograms: payload.charityProgramIds.map((id) => this.getProgram(id)),
        createdAt: DEMO_TIMESTAMP,
        updatedAt: DEMO_TIMESTAMP,
      },
      generatedPasskey: '0000000000000000',
    };
  }

  private paginate<T>(items: T[], query: ListQuery): PaginatedResponse<T> {
    const page = Math.max(1, Number(query.page ?? 1));
    const pageSize = Math.max(1, Number(query.pageSize ?? 10));
    const totalItems = items.length;
    return {
      items: items.slice((page - 1) * pageSize, page * pageSize),
      meta: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
      },
    };
  }

  private matches(value: object, search?: string) {
    return !search || JSON.stringify(value).toLowerCase().includes(search.toLowerCase());
  }

  private programId(key: string) { return `demo-program-${key}`; }
  private benefitId(key: string) { return `demo-benefit-${key}`; }
  private administratorId(key: string) { return `demo-administrator-${key}`; }
  private beneficiaryId(key: string) { return `demo-beneficiary-${key}`; }
}
