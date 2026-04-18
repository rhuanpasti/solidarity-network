import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BeneficiaryStatus } from '@solidarity-network/shared';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { FormSelectComponent, type SelectOption } from '../../../shared/components/form-select/form-select.component';

@Component({
  selector: 'app-beneficiary-filters',
  standalone: true,
  imports: [ReactiveFormsModule, TranslateModule, ButtonComponent, FormSelectComponent],
  template: `
    <form class="panel filter-panel" [formGroup]="form()" (ngSubmit)="submitFilters.emit()">
      <div class="field-grid">
        <label class="field">
          <span>{{ 'common.search' | translate }}</span>
          <input class="input" type="search" formControlName="search" />
        </label>

        <app-form-select
          [control]="charityProgramControl()"
          label="forms.charityProgram"
          [options]="programOptions()"
          placeholder="common.all"
        />

        <app-form-select
          [control]="statusControl()"
          label="forms.status"
          [options]="statusOptions"
          placeholder="common.all"
        />

        <label class="field">
          <span>{{ 'common.pageSize' | translate }}</span>
          <select class="input" formControlName="pageSize" (change)="pageSizeChange.emit($any($event.target).value)">
            @for (size of pageSizes(); track size) {
              <option [value]="size">{{ size }}</option>
            }
          </select>
        </label>
      </div>

      <div class="actions">
        <app-button type="submit" variant="secondary">
          {{ 'common.applyFilters' | translate }}
        </app-button>
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BeneficiaryFiltersComponent {
  readonly form = input.required<FormGroup>();
  readonly programOptions = input.required<SelectOption[]>();
  readonly pageSizes = input.required<number[]>();
  readonly submitFilters = output<void>();
  readonly pageSizeChange = output<string>();
  readonly statusOptions: SelectOption[] = [
    { value: BeneficiaryStatus.Active, translationKey: 'enums.beneficiaryStatuses.active' },
    { value: BeneficiaryStatus.Inactive, translationKey: 'enums.beneficiaryStatuses.inactive' },
    { value: BeneficiaryStatus.Archived, translationKey: 'enums.beneficiaryStatuses.archived' },
  ];

  charityProgramControl() {
    return this.form().get('charityProgramId') as FormControl<string>;
  }

  statusControl() {
    return this.form().get('status') as FormControl<string>;
  }
}
