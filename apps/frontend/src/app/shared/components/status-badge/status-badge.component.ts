import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: '<span class="badge" [class.success]="tone() === \'success\'" [class.warning]="tone() === \'warning\'">{{ label() }}</span>',
  styles: [
    `
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        border-radius: 999px;
        padding: 0.38rem 0.72rem;
        font-size: 0.78rem;
        font-weight: 700;
        background: #f0fdf4;
        color: #15803d;
      }
      .badge::before {
        content: '';
        width: 0.45rem;
        height: 0.45rem;
        border-radius: 999px;
        background: currentColor;
      }
      .badge.success {
        background: #dcfce7;
        color: #15803d;
      }
      .badge.warning {
        background: #fef3c7;
        color: #b45309;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadgeComponent {
  readonly active = input<boolean>(true);
  readonly activeLabel = input<string>('Active');
  readonly inactiveLabel = input<string>('Inactive');

  readonly label = computed(() => (this.active() ? this.activeLabel() : this.inactiveLabel()));
  readonly tone = computed(() => (this.active() ? 'success' : 'warning'));
}
