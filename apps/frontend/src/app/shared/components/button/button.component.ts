import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { type ButtonType, type ButtonVariant } from './button.types';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'button-host',
  },
})
export class ButtonComponent {
  readonly type = input<ButtonType>('button');
  readonly variant = input<ButtonVariant>('primary');
  readonly disabled = input(false);
  readonly loading = input(false);

  readonly isDisabled = computed(() => this.disabled() || this.loading());
  readonly className = computed(() => `${this.variant()}-button`);
}
