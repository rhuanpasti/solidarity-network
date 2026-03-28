import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { CharityProgramStatus, type CharityProgramSummary } from '@solidarity-network/shared';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { touchAll } from '../../shared/utils/form.utils';
import { ToastService } from '../../core/services/toast.service';
import { CharityProgramsApi } from './charity-programs.api';

@Component({
  selector: 'sn-charity-programs-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslateModule,
    DatePipe,
    PageHeaderComponent,
    StatusBadgeComponent,
    EmptyStateComponent,
  ],
  templateUrl: './charity-programs.page.html',
  styleUrl: './charity-programs.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CharityProgramsPage implements OnInit {
  readonly CharityProgramStatus = CharityProgramStatus;
  private readonly formBuilder = inject(FormBuilder);
  private readonly api = inject(CharityProgramsApi);
  private readonly toastService = inject(ToastService);

  readonly items = signal<CharityProgramSummary[]>([]);
  readonly selected = signal<CharityProgramSummary | null>(null);
  readonly loading = signal(false);
  readonly search = signal('');

  readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', [Validators.required, Validators.maxLength(1000)]],
    status: this.formBuilder.nonNullable.control<CharityProgramStatus>(
      CharityProgramStatus.Active,
      {
        validators: [Validators.required],
      },
    ),
  });

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api.list(this.search()).subscribe({
      next: (response) => {
        this.items.set(response.items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  searchPrograms(value: string) {
    this.search.set(value);
    this.load();
  }

  select(program: CharityProgramSummary) {
    this.selected.set(program);
    this.form.reset({
      name: program.name,
      description: program.description,
      status: program.status,
    });
  }

  resetForm() {
    this.selected.set(null);
    this.form.reset({
      name: '',
      description: '',
      status: CharityProgramStatus.Active,
    });
  }

  submit() {
    if (this.form.invalid) {
      touchAll(this.form);
      return;
    }

    const payload = this.form.getRawValue();
    const request = this.selected()
      ? this.api.update(this.selected()!.id, payload)
      : this.api.create(payload);

    request.subscribe(() => {
      this.toastService.show({ type: 'success', text: 'Saved successfully.' });
      this.resetForm();
      this.load();
    });
  }

  toggleStatus(program: CharityProgramSummary) {
    const nextStatus =
      program.status === CharityProgramStatus.Active
        ? CharityProgramStatus.Inactive
        : CharityProgramStatus.Active;

    this.api.updateStatus(program.id, nextStatus).subscribe(() => this.load());
  }
}
