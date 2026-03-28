import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import type { BenefitDeliverySummary } from '@solidarity-network/shared';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { AdministratorsApi } from '../administrators/administrators.api';
import { BenefitDeliveriesApi } from '../benefit-deliveries/benefit-deliveries.api';
import { BeneficiariesApi } from '../beneficiaries/beneficiaries.api';
import { BenefitsApi } from '../benefits/benefits.api';
import { CharityProgramsApi } from '../charity-programs/charity-programs.api';

@Component({
  selector: 'sn-dashboard-page',
  standalone: true,
  imports: [TranslateModule, DatePipe, PageHeaderComponent],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage implements OnInit {
  private readonly programsApi = inject(CharityProgramsApi);
  private readonly administratorsApi = inject(AdministratorsApi);
  private readonly beneficiariesApi = inject(BeneficiariesApi);
  private readonly benefitsApi = inject(BenefitsApi);
  private readonly deliveriesApi = inject(BenefitDeliveriesApi);

  readonly stats = signal([
    { key: 'programs', label: 'features.dashboard.stats.programs', value: 0 },
    { key: 'administrators', label: 'features.dashboard.stats.administrators', value: 0 },
    { key: 'beneficiaries', label: 'features.dashboard.stats.beneficiaries', value: 0 },
    { key: 'benefits', label: 'features.dashboard.stats.benefits', value: 0 },
  ]);
  readonly recentDeliveries = signal<BenefitDeliverySummary[]>([]);

  ngOnInit() {
    this.programsApi.list().subscribe((response) =>
      this.patchStat('programs', response.meta.totalItems),
    );
    this.administratorsApi.list().subscribe((response) =>
      this.patchStat('administrators', response.meta.totalItems),
    );
    this.beneficiariesApi.list().subscribe((response) =>
      this.patchStat('beneficiaries', response.meta.totalItems),
    );
    this.benefitsApi.list().subscribe((response) =>
      this.patchStat('benefits', response.meta.totalItems),
    );
    this.deliveriesApi.list().subscribe((response) => this.recentDeliveries.set(response.items.slice(0, 5)));
  }

  private patchStat(key: string, value: number) {
    this.stats.update((current) =>
      current.map((item) => (item.key === key ? { ...item, value } : item)),
    );
  }
}

