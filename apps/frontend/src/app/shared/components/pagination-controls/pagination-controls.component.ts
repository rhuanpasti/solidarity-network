import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { PaginationMeta } from '@solidarity-network/shared';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-pagination-controls',
  standalone: true,
  imports: [TranslateModule, ButtonComponent],
  template: `
    <div class="pagination">
      <div class="pagination-summary">
        <p>
          {{
            'common.paginationSummary'
              | translate
                : {
                    page: pagination().page,
                    totalPages: pagination().totalPages,
                    totalItems: pagination().totalItems
                  }
          }}
        </p>

        @if (pageSizes().length && pageSize() !== null) {
          <label class="pagination-page-size">
            <span>{{ 'common.pageSize' | translate }}</span>
            <select
              class="input"
              [value]="pageSize()"
              [disabled]="loading()"
              (change)="handlePageSizeChange($event)"
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
          [disabled]="pagination().page <= 1 || loading()"
          (click)="pageChange.emit(pagination().page - 1)"
        >
          {{ 'common.previous' | translate }}
        </app-button>
        <app-button
          type="button"
          variant="ghost"
          [disabled]="pagination().page >= pagination().totalPages || loading()"
          (click)="pageChange.emit(pagination().page + 1)"
        >
          {{ 'common.next' | translate }}
        </app-button>
      </div>
    </div>
  `,
  styleUrl: './pagination-controls.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginationControlsComponent {
  readonly pagination = input.required<PaginationMeta>();
  readonly loading = input(false);
  readonly pageSize = input<number | null>(null);
  readonly pageSizes = input<readonly number[]>([]);
  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();

  handlePageSizeChange(event: Event) {
    const fallback = this.pageSize() ?? this.pageSizes()[0];

    if (fallback === undefined) {
      return;
    }

    this.pageSizeChange.emit(readPageSize(event, fallback));
  }
}

export function readPageSize(event: Event, fallback: number) {
  const value = Number((event.target as HTMLSelectElement | null)?.value);

  return Number.isInteger(value) && value > 0 ? value : fallback;
}
