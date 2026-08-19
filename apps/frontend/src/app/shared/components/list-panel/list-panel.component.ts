import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { PaginationMeta } from '@solidarity-network/shared';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { PaginationControlsComponent } from '../pagination-controls/pagination-controls.component';

@Component({
  selector: 'app-list-panel',
  standalone: true,
  imports: [TranslateModule, EmptyStateComponent, PaginationControlsComponent],
  template: `
    <section class="panel" [title]="tooltipText() | translate">
      <div class="panel-heading">
        <div>
          <h3>{{ title() | translate }}</h3>
          <p>{{ description() | translate }}</p>
        </div>
        <ng-content select="[panelAction]" />
      </div>

      <ng-content select="[panelToolbar]" />

      @if (loading() && !hasItems()) {
        <div class="list-state" aria-live="polite">{{ 'common.loadingDescription' | translate }}</div>
      }

      @if (hasItems()) {
        <ng-content select="[panelList]" />

        @if (pagination(); as meta) {
          <app-pagination-controls
            [pagination]="meta"
            [loading]="loading()"
            [pageSize]="pageSize()"
            [pageSizes]="pageSizes()"
            (pageChange)="pageChange.emit($event)"
            (pageSizeChange)="pageSizeChange.emit($event)"
          />
        }
      } @else if (shouldShowListEmptyState(loading(), hasItems())) {
        <app-empty-state [title]="emptyTitle()" [description]="emptyDescription()" />
      }
    </section>
  `,
  styleUrl: './list-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListPanelComponent {
  readonly shouldShowListEmptyState = shouldShowListEmptyState;
  readonly title = input.required<string>();
  readonly tooltip = input<string | null>(null);
  readonly description = input.required<string>();
  readonly emptyTitle = input.required<string>();
  readonly emptyDescription = input.required<string>();
  readonly hasItems = input(false);
  readonly loading = input(false);
  readonly pagination = input<PaginationMeta | null>(null);
  readonly pageSize = input<number | null>(null);
  readonly pageSizes = input<readonly number[]>([]);
  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();
  readonly tooltipText = computed(() => this.tooltip() ?? this.title());
}

export function shouldShowListEmptyState(loading: boolean, hasItems: boolean) {
  return !loading && !hasItems;
}
