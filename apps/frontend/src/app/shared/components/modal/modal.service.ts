import { Dialog, type DialogRef } from '@angular/cdk/dialog';
import { inject, Injectable, type TemplateRef } from '@angular/core';
import { MODAL_DIALOG_CONFIG } from './modal.config';

@Injectable({ providedIn: 'root' })
export class ModalService {
  private readonly dialog = inject(Dialog);

  open(template: TemplateRef<unknown>): DialogRef<unknown> {
    return this.dialog.open(template, { ...MODAL_DIALOG_CONFIG });
  }
}
