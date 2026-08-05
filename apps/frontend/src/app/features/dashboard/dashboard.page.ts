import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { AdministratorsService } from '../../core/services/administrators.service';
import { BeneficiariesService } from '../../core/services/beneficiaries.service';
import { BenefitDeliveriesService } from '../../core/services/benefit-deliveries.service';
import { BenefitsService } from '../../core/services/benefits.service';
import { CharityProgramsService } from '../../core/services/charity-programs.service';

const DEFAULT_LIST_QUERY = { page: 1, pageSize: 10 };
const BENEFITS_LIST_QUERY = { page: 1, pageSize: 100 };

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [TranslateModule, DatePipe, PageHeaderComponent, RouterLink],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage implements OnInit {
  private readonly charityProgramsService = inject(CharityProgramsService);
  private readonly administratorsService = inject(AdministratorsService);
  private readonly beneficiariesService = inject(BeneficiariesService);
  private readonly benefitsService = inject(BenefitsService);
  private readonly benefitDeliveriesService = inject(BenefitDeliveriesService);

  private readonly programsState = computed(() => this.charityProgramsService.listState(DEFAULT_LIST_QUERY));
  private readonly administratorsState = computed(() => this.administratorsService.listState(DEFAULT_LIST_QUERY));
  private readonly beneficiariesState = computed(() => this.beneficiariesService.listState(DEFAULT_LIST_QUERY));
  private readonly benefitsState = computed(() => this.benefitsService.listState(BENEFITS_LIST_QUERY));
  private readonly deliveriesState = computed(() => this.benefitDeliveriesService.listState(DEFAULT_LIST_QUERY));

  readonly stats = computed(() => [
    {
      key: 'programs',
      label: 'features.dashboard.stats.programs',
      value: this.programsState().data?.meta.totalItems ?? 0,
    },
    {
      key: 'administrators',
      label: 'features.dashboard.stats.administrators',
      value: this.administratorsState().data?.meta.totalItems ?? 0,
    },
    {
      key: 'beneficiaries',
      label: 'features.dashboard.stats.beneficiaries',
      value: this.beneficiariesState().data?.meta.totalItems ?? 0,
    },
    {
      key: 'benefits',
      label: 'features.dashboard.stats.benefits',
      value: this.benefitsState().data?.meta.totalItems ?? 0,
    },
  ]);
  readonly recentDeliveries = computed(
    () => this.deliveriesState().data?.items.slice(0, 5) ?? [],
  );
  readonly refreshing = computed(() =>
    [
      this.programsState(),
      this.administratorsState(),
      this.beneficiariesState(),
      this.benefitsState(),
      this.deliveriesState(),
    ].some((state) => state.refreshing),
  );
  readonly refreshCooldownSeconds = computed(() => {
    const nextRefreshAt = [
      this.programsState(),
      this.administratorsState(),
      this.beneficiariesState(),
      this.benefitsState(),
      this.deliveriesState(),
    ]
      .map((state) => state.nextRefreshAt)
      .filter((value): value is number => value !== null)
      .sort((left, right) => left - right)[0];

    return nextRefreshAt === undefined
      ? 0
      : Math.max(1, Math.ceil((nextRefreshAt - Date.now()) / 1000));
  });
  readonly refreshDisabled = computed(
    () => this.refreshing() || this.refreshCooldownSeconds() > 0,
  );

  ngOnInit() {
    this.ensureLoaded();
  }

  refresh() {
    this.charityProgramsService.refreshList(DEFAULT_LIST_QUERY);
    this.administratorsService.refreshList(DEFAULT_LIST_QUERY);
    this.beneficiariesService.refreshList(DEFAULT_LIST_QUERY);
    this.benefitsService.refreshList(BENEFITS_LIST_QUERY);
    this.benefitDeliveriesService.refreshList(DEFAULT_LIST_QUERY);
  }

  private ensureLoaded() {
    this.charityProgramsService.ensureList(DEFAULT_LIST_QUERY);
    this.administratorsService.ensureList(DEFAULT_LIST_QUERY);
    this.beneficiariesService.ensureList(DEFAULT_LIST_QUERY);
    this.benefitsService.ensureList(BENEFITS_LIST_QUERY);
    this.benefitDeliveriesService.ensureList(DEFAULT_LIST_QUERY);
  }
}
