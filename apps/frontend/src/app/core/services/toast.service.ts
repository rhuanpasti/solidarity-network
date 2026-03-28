import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  type: 'success' | 'error' | 'info';
  text: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly message = signal<ToastMessage | null>(null);

  show(message: ToastMessage) {
    this.message.set(message);
    window.setTimeout(() => this.message.set(null), 4000);
  }

  clear() {
    this.message.set(null);
  }
}

