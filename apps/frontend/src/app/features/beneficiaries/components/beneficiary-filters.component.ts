import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BeneficiaryStatus } from '@solidarity-network/shared';
import type { BeneficiaryFiltersForm } from '../beneficiaries.state';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { FormSelectComponent, type SelectOption } from '../../../shared/components/form-select/form-select.component';

@Component({
  selector: 'app-beneficiary-filters',
  standalone: true,
  imports: [ReactiveFormsModule, TranslateModule, ButtonComponent, FormSelectComponent],
  template: `
    <form class="panel filter-panel" [formGroup]="form()" (ngSubmit)="submitFilters.emit()">
      <div class="filter-grid">
        <label class="field">
          <span>{{ 'common.search' | translate }}</span>
          <input
            class="input"
            type="search"
            formControlName="search"
            [placeholder]="'common.beneficiarySearchPlaceholder' | translate"
          />
        </label>

        <app-form-select
          [control]="form().controls.charityProgramId"
          label="forms.charityProgram"
          [options]="programOptions()"
          placeholder="common.all"
        />

        <app-form-select
          [control]="form().controls.status"
          label="forms.status"
          [options]="statusOptions"
          placeholder="common.all"
        />

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
  readonly form = input.required<BeneficiaryFiltersForm>();
  readonly programOptions = input.required<SelectOption[]>();
  readonly submitFilters = output<void>();
  readonly statusOptions: SelectOption[] = [
    { value: BeneficiaryStatus.Active, translationKey: 'enums.beneficiaryStatuses.active' },
    { value: BeneficiaryStatus.Inactive, translationKey: 'enums.beneficiaryStatuses.inactive' },
    { value: BeneficiaryStatus.Archived, translationKey: 'enums.beneficiaryStatuses.archived' },
  ];
}
