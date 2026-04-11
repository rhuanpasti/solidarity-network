import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly requests = signal<true[]>([]);

  readonly isLoading = computed(() => this.requests().length > 0);

  begin() {
    this.requests.update((current) => [...current, true]);
  }

  end() {
    this.requests.update((current) => current.slice(0, -1));
  }
}
