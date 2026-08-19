import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [TranslateModule],
  styleUrl: './empty-state.component.scss',
  template: `
    <section class="empty-state" [title]="tooltipText() | translate">
      <h3>{{ title() | translate }}</h3>
      <p>{{ description() | translate }}</p>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly tooltip = input<string | null>(null);
  readonly description = input.required<string>();
  readonly tooltipText = computed(() => this.tooltip() ?? this.title());
}
