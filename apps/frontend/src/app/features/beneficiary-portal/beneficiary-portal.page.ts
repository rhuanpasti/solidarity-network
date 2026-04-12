import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { BeneficiaryPortalSummary } from '@solidarity-network/shared';
import { BeneficiaryPortalService } from '../../core/services/beneficiary-portal.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'sn-beneficiary-portal-page',
  standalone: true,
  imports: [TranslateModule, DatePipe, EmptyStateComponent, PageHeaderComponent],
  templateUrl: './beneficiary-portal.page.html',
  styleUrl: './beneficiary-portal.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BeneficiaryPortalPage implements OnInit {
  private readonly beneficiaryPortalService = inject(BeneficiaryPortalService);

  readonly overview = signal<BeneficiaryPortalSummary | null>(null);
  readonly nextDelivery = computed(() => this.overview()?.upcomingDeliveries[0] ?? null);

  ngOnInit() {
    this.beneficiaryPortalService
      .getMine()
      .subscribe((overview) => this.overview.set(overview));
  }
}
