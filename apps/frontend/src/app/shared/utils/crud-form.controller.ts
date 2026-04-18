import { signal, type WritableSignal } from '@angular/core';
import type { AbstractControl } from '@angular/forms';

export type CrudFormMode = 'create' | 'view' | 'edit';

interface CrudFormControllerOptions<TItem> {
  form: AbstractControl;
  onCreate: () => void;
  onView: (item: TItem) => void;
}

export class CrudFormController<TItem> {
  readonly selected: WritableSignal<TItem | null> = signal<TItem | null>(null);
  readonly mode: WritableSignal<CrudFormMode> = signal<CrudFormMode>('create');
  readonly isReadOnly: WritableSignal<boolean> = signal(false);

  constructor(private readonly options: CrudFormControllerOptions<TItem>) {}

  select(item: TItem) {
    this.selected.set(item);
    this.mode.set('view');
    this.options.onView(item);
    this.setFormReadOnly(true);
  }

  startCreate() {
    this.selected.set(null);
    this.mode.set('create');
    this.options.onCreate();
    this.setFormReadOnly(false);
  }

  startEditing() {
    if (!this.selected()) {
      return;
    }

    this.mode.set('edit');
    this.setFormReadOnly(false);
  }

  cancel() {
    const selected = this.selected();

    if (selected) {
      this.select(selected);
      return;
    }

    this.startCreate();
  }

  private setFormReadOnly(readOnly: boolean) {
    this.isReadOnly.set(readOnly);

    if (readOnly) {
      this.options.form.disable({ emitEvent: false });
      return;
    }

    this.options.form.enable({ emitEvent: false });
  }
}
