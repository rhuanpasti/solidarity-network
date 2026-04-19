import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { BeneficiaryFiltersComponent } from './components/beneficiary-filters.component';
import { BeneficiaryFormComponent } from './components/beneficiary-form.component';
import { BeneficiaryListComponent } from './components/beneficiary-list.component';
import { BeneficiariesState } from './beneficiaries.state';

@Component({
  selector: 'app-beneficiaries-page',
  standalone: true,
  imports: [
    PageHeaderComponent,
    BeneficiaryFiltersComponent,
    BeneficiaryFormComponent,
    BeneficiaryListComponent,
  ],
  templateUrl: './beneficiaries.page.html',
  styleUrl: './beneficiaries.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [BeneficiariesState],
})
export class BeneficiariesPage implements OnInit {
  readonly state = inject(BeneficiariesState);
  readonly programOptions = computed(() =>
    this.state.programs().map((program) => ({ value: program.id, label: program.name })),
  );
  readonly countryOptions = computed(() =>
    this.state.countryOptions.map((country) => ({
      value: country,
      translationKey: this.state.countryLabelKey(country),
    })),
  );

  ngOnInit() {
    this.state.initialize();
  }
}
