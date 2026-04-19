import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import type { BenefitDeliverySummary } from '@solidarity-network/shared';
import { forkJoin } from 'rxjs';
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
    forkJoin({
      programs: this.charityProgramsService.list(),
      administrators: this.administratorsService.list(),
      beneficiaries: this.beneficiariesService.list(),
      benefits: this.benefitsService.list(),
      deliveries: this.benefitDeliveriesService.list(),
    }).subscribe(
      ({ programs, administrators, beneficiaries, benefits, deliveries }) => {
        this.stats.set([
          {
            key: 'programs',
            label: 'features.dashboard.stats.programs',
            value: programs.meta.totalItems,
          },
          {
            key: 'administrators',
            label: 'features.dashboard.stats.administrators',
            value: administrators.meta.totalItems,
          },
          {
            key: 'beneficiaries',
            label: 'features.dashboard.stats.beneficiaries',
            value: beneficiaries.meta.totalItems,
          },
          {
            key: 'benefits',
            label: 'features.dashboard.stats.benefits',
            value: benefits.meta.totalItems,
          },
        ]);
        this.recentDeliveries.set(deliveries.items.slice(0, 5));
      },
    );
  }
}
