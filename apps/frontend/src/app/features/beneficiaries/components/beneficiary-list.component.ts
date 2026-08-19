import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { PaginationMeta, BeneficiarySummary } from '@solidarity-network/shared';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ListPanelComponent } from '../../../shared/components/list-panel/list-panel.component';

@Component({
  selector: 'app-beneficiary-list',
  standalone: true,
  imports: [TranslateModule, ButtonComponent, ListPanelComponent],
  template: `
    <app-list-panel
      [title]="'features.beneficiaries.title' | translate"
      description="features.beneficiaries.formDescription"
      emptyTitle="features.beneficiaries.emptyTitle"
      emptyDescription="features.beneficiaries.emptyDescription"
      [hasItems]="items().length > 0"
      [loading]="listLoading()"
      [pagination]="pagination()"
      [pageSize]="pageSize()"
      [pageSizes]="pageSizes()"
      (pageChange)="pageChange.emit($event)"
      (pageSizeChange)="pageSizeChange.emit($event)"
    >
      <app-button data-testid="beneficiary-create" panelAction type="button" variant="secondary" [disabled]="submitPending()" (click)="create.emit()">
        {{ 'common.add' | translate }}
      </app-button>

      <div panelList class="list">
        @for (item of items(); track item.id) {
          <button type="button" class="list-item" (click)="itemSelected.emit(item)">
            <div>
              <strong>{{ item.fullName }}</strong>
              @if (item.email) {
                <small>{{ item.email }}</small>
              }
              <small>
                {{
                  item.charityPrograms.length
                    ? charityProgramNames(item)
                    : ('common.unassigned' | translate)
                }}
              </small>
            </div>
            <small>{{ ('enums.beneficiaryStatuses.' + item.status) | translate }}</small>
          </button>
        }
      </div>
    </app-list-panel>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BeneficiaryListComponent {
  readonly items = input.required<BeneficiarySummary[]>();
  readonly pagination = input.required<PaginationMeta>();
  readonly pageSize = input.required<number>();
  readonly pageSizes = input.required<readonly number[]>();
  readonly listLoading = input(false);
  readonly submitPending = input(false);
  readonly create = output<void>();
  readonly itemSelected = output<BeneficiarySummary>();
  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();

  charityProgramNames(item: BeneficiarySummary) {
    return item.charityPrograms.map((program) => program.name).join(', ');
  }
}
