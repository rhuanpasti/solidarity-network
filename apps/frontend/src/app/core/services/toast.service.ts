import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  type: 'success' | 'error' | 'info';
  text?: string;
  translationKey?: string;
  translationParams?: Record<string, string | number>;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly message = signal<ToastMessage | null>(null);
  private timeoutId: number | null = null;

  show(message: ToastMessage) {
    if (this.timeoutId !== null) {
      window.clearTimeout(this.timeoutId);
    }

    this.message.set(message);
    this.timeoutId = window.setTimeout(() => {
      this.timeoutId = null;
      this.message.set(null);
    }, 4000);
  }

  clear() {
    if (this.timeoutId !== null) {
      window.clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    this.message.set(null);
  }
}
