import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly activeRequests = signal(0);
  private readonly visibleState = signal(false);
  private showTimeoutId: number | null = null;
  private hideTimeoutId: number | null = null;
  private visibleSince = 0;

  readonly isLoading = computed(() => this.activeRequests() > 0);
  readonly isVisible = computed(() => this.visibleState());

  begin() {
    const nextCount = this.activeRequests() + 1;
    this.activeRequests.set(nextCount);

    if (nextCount > 1 || this.visibleState()) {
      return;
    }

    if (this.hideTimeoutId !== null) {
      window.clearTimeout(this.hideTimeoutId);
      this.hideTimeoutId = null;
    }

    if (this.showTimeoutId !== null) {
      window.clearTimeout(this.showTimeoutId);
    }

    this.showTimeoutId = window.setTimeout(() => {
      this.showTimeoutId = null;

      if (this.activeRequests() <= 0) {
        return;
      }

      this.visibleSince = Date.now();
      this.visibleState.set(true);
    }, 180);
  }

  end() {
    const nextCount = Math.max(0, this.activeRequests() - 1);
    this.activeRequests.set(nextCount);

    if (nextCount > 0) {
      return;
    }

    if (this.showTimeoutId !== null) {
      window.clearTimeout(this.showTimeoutId);
      this.showTimeoutId = null;
    }

    if (!this.visibleState()) {
      return;
    }

    const elapsed = Date.now() - this.visibleSince;
    const remainingVisibleTime = Math.max(0, 320 - elapsed);

    if (this.hideTimeoutId !== null) {
      window.clearTimeout(this.hideTimeoutId);
    }

    this.hideTimeoutId = window.setTimeout(() => {
      this.hideTimeoutId = null;
      if (this.activeRequests() === 0) {
        this.visibleState.set(false);
      }
    }, remainingVisibleTime);
  }
}
