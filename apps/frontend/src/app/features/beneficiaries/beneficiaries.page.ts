import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { BeneficiaryFiltersComponent } from './components/beneficiary-filters.component';
import { BeneficiaryFormComponent } from './components/beneficiary-form.component';
import { BeneficiaryListComponent } from './components/beneficiary-list.component';
import { BeneficiariesFacade } from './beneficiaries.facade';

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
  providers: [BeneficiariesFacade],
})
export class BeneficiariesPage implements OnInit {
  private readonly facade = inject(BeneficiariesFacade);
  readonly vm = this.facade;
  readonly programOptions = computed(() =>
    this.vm.programs().map((program) => ({ value: program.id, label: program.name })),
  );
  readonly countryOptions = computed(() =>
    this.vm.countryOptions.map((country) => ({
      value: country,
      translationKey: this.vm.countryLabelKey(country),
    })),
  );

  ngOnInit() {
    this.facade.initialize();
  }
}
