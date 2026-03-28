import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'sn-status-badge',
  standalone: true,
  template: '<span class="badge" [class.success]="tone() === \'success\'" [class.warning]="tone() === \'warning\'">{{ label() }}</span>',
  styles: [
    `
      .badge {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        padding: 0.35rem 0.7rem;
        font-size: 0.78rem;
        font-weight: 700;
        background: rgba(24, 77, 71, 0.12);
        color: #184d47;
      }
      .badge.success {
        background: rgba(24, 77, 71, 0.12);
        color: #184d47;
      }
      .badge.warning {
        background: rgba(157, 109, 31, 0.14);
        color: #8a5e16;
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

