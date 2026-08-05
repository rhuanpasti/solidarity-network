import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import type { TemplateRef } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CharityProgramStatus } from '@solidarity-network/shared';
import type { BeneficiarySummary } from '@solidarity-network/shared';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { BeneficiaryFiltersComponent } from './components/beneficiary-filters.component';
import { BeneficiaryFormComponent } from './components/beneficiary-form.component';
import { BeneficiaryListComponent } from './components/beneficiary-list.component';
import { BeneficiariesState } from './beneficiaries.state';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { ModalService } from '../../shared/components/modal/modal.service';

@Component({
  selector: 'app-beneficiaries-page',
  standalone: true,
  imports: [
    PageHeaderComponent,
    TranslateModule,
    ButtonComponent,
    BeneficiaryFiltersComponent,
    BeneficiaryFormComponent,
    BeneficiaryListComponent,
    ModalComponent,
  ],
  templateUrl: './beneficiaries.page.html',
  styleUrl: './beneficiaries.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [BeneficiariesState],
})
export class BeneficiariesPage implements OnInit {
  readonly beneficiariesState = inject(BeneficiariesState);
  private readonly modalService = inject(ModalService);
  private editorDialogRef: DialogRef<unknown> | null = null;
  readonly programOptions = computed(() =>
    this.beneficiariesState
      .programs()
      .map((program) => ({ value: program.id, label: program.name })),
  );
  readonly activeProgramOptions = computed(() =>
    this.beneficiariesState
      .programs()
      .filter((program) => program.status === CharityProgramStatus.Active)
      .map((program) => ({ value: program.id, label: program.name })),
  );
  readonly countryOptions = computed(() =>
    this.beneficiariesState.countryOptions.map((country) => ({
      value: country,
      translationKey: this.beneficiariesState.countryLabelKey(country),
    })),
  );
  readonly refreshing = computed(() => this.beneficiariesState.refreshState().refreshing);
  readonly refreshCooldownSeconds = computed(() => {
    const nextRefreshAt = this.beneficiariesState.refreshState().nextRefreshAt;
    return nextRefreshAt === null
      ? 0
      : Math.max(1, Math.ceil((nextRefreshAt - Date.now()) / 1000));
  });
  readonly refreshDisabled = computed(
    () => this.refreshing() || this.refreshCooldownSeconds() > 0,
  );

  ngOnInit() {
    this.beneficiariesState.initialize();
  }

  refresh() {
    this.beneficiariesState.refresh();
  }

  openCreate(template: TemplateRef<unknown>) {
    this.beneficiariesState.editor.startCreate();
    this.openEditorDialog(template);
  }

  openItem(item: BeneficiarySummary, template: TemplateRef<unknown>) {
    this.beneficiariesState.editor.select(item);
    this.openEditorDialog(template);
  }

  cancelEditor() {
    this.beneficiariesState.editor.cancel();
    this.closeEditorDialog();
  }

  closeEditorDialog() {
    this.editorDialogRef?.close();
    this.editorDialogRef = null;
  }

  private openEditorDialog(template: TemplateRef<unknown>) {
    this.editorDialogRef?.close();
    this.editorDialogRef = this.modalService.open(template);
    this.editorDialogRef.closed.subscribe(() => {
      this.editorDialogRef = null;
    });
  }
}
