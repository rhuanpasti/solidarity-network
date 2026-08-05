import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { PaginationMeta } from '@solidarity-network/shared';
import { ButtonComponent } from '../button/button.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';

@Component({
  selector: 'app-list-panel',
  standalone: true,
  imports: [TranslateModule, ButtonComponent, EmptyStateComponent],
  template: `
    <section class="panel">
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
          <div class="pagination">
            <p>
              {{
                'common.paginationSummary'
                  | translate
                    : {
                        page: meta.page,
                        totalPages: meta.totalPages,
                        totalItems: meta.totalItems
                      }
              }}
            </p>
            <div class="pagination-actions">
              <app-button
                type="button"
                variant="ghost"
                [disabled]="meta.page <= 1 || loading()"
                (click)="pageChange.emit(meta.page - 1)"
              >
                {{ 'common.previous' | translate }}
              </app-button>
              <app-button
                type="button"
                variant="ghost"
                [disabled]="meta.page >= meta.totalPages || loading()"
                (click)="pageChange.emit(meta.page + 1)"
              >
                {{ 'common.next' | translate }}
              </app-button>
            </div>
          </div>
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
  readonly description = input.required<string>();
  readonly emptyTitle = input.required<string>();
  readonly emptyDescription = input.required<string>();
  readonly hasItems = input(false);
  readonly loading = input(false);
  readonly pagination = input<PaginationMeta | null>(null);
  readonly pageChange = output<number>();
}

export function shouldShowListEmptyState(loading: boolean, hasItems: boolean) {
  return !loading && !hasItems;
}
