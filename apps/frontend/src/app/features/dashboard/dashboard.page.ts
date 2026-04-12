import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import type { BenefitDeliverySummary } from '@solidarity-network/shared';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { AdministratorsService } from '../../core/services/administrators.service';
import { BeneficiariesService } from '../../core/services/beneficiaries.service';
import { BenefitDeliveriesService } from '../../core/services/benefit-deliveries.service';
import { BenefitsService } from '../../core/services/benefits.service';
import { CharityProgramsService } from '../../core/services/charity-programs.service';

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

  readonly stats = signal([
    { key: 'programs', label: 'features.dashboard.stats.programs', value: 0 },
    { key: 'administrators', label: 'features.dashboard.stats.administrators', value: 0 },
    { key: 'beneficiaries', label: 'features.dashboard.stats.beneficiaries', value: 0 },
    { key: 'benefits', label: 'features.dashboard.stats.benefits', value: 0 },
  ]);
  readonly recentDeliveries = signal<BenefitDeliverySummary[]>([]);

  ngOnInit() {
    this.charityProgramsService.list().subscribe((response) =>
      this.patchStat('programs', response.meta.totalItems),
    );
    this.administratorsService.list().subscribe((response) =>
      this.patchStat('administrators', response.meta.totalItems),
    );
    this.beneficiariesService.list().subscribe((response) =>
      this.patchStat('beneficiaries', response.meta.totalItems),
    );
    this.benefitsService.list().subscribe((response) =>
      this.patchStat('benefits', response.meta.totalItems),
    );
    this.benefitDeliveriesService.list().subscribe((response) =>
      this.recentDeliveries.set(response.items.slice(0, 5)),
    );
  }

  private patchStat(key: string, value: number) {
    this.stats.update((current) =>
      current.map((item) => (item.key === key ? { ...item, value } : item)),
    );
  }
}
