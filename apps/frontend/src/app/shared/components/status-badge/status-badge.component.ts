import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  styleUrl: './status-badge.component.scss',
  template: '<span class="badge" [class.success]="tone() === \'success\'" [class.warning]="tone() === \'warning\'">{{ label() }}</span>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadgeComponent {
  readonly active = input<boolean>(true);
  readonly activeLabel = input<string>('Active');
  readonly inactiveLabel = input<string>('Inactive');

  readonly label = computed(() => (this.active() ? this.activeLabel() : this.inactiveLabel()));
  readonly tone = computed(() => (this.active() ? 'success' : 'warning'));
}
