import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class BackendAvailabilityService {
  readonly isUnavailable = signal(false);

  markUnavailable() {
    this.isUnavailable.set(true);
  }

  clear() {
    this.isUnavailable.set(false);
  }

  retry() {
    this.clear();

    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }
}
