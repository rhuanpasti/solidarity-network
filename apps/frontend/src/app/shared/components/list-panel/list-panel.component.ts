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
            <div class="pagination-summary">
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

              @if (pageSizes().length) {
                <label class="pagination-page-size">
                  <span>{{ 'common.pageSize' | translate }}</span>
                  <select
                    class="input"
                    [value]="pageSize()"
                    [disabled]="loading()"
                    (change)="pageSizeChange.emit(readPageSize($event, pageSize() ?? pageSizes()[0]))"
                  >
                    @for (size of pageSizes(); track size) {
                      <option [value]="size">{{ size }}</option>
                    }
                  </select>
                </label>
              }
            </div>

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
  readonly pageSize = input<number | null>(null);
  readonly pageSizes = input<readonly number[]>([]);
  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();
  readonly readPageSize = readPageSize;
}

export function shouldShowListEmptyState(loading: boolean, hasItems: boolean) {
  return !loading && !hasItems;
}

export function readPageSize(event: Event, fallback: number) {
  const value = Number((event.target as HTMLSelectElement | null)?.value);

  return Number.isInteger(value) && value > 0 ? value : fallback;
}
