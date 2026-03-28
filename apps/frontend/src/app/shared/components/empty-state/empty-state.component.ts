import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'sn-empty-state',
  standalone: true,
  imports: [TranslateModule],
  template: `
    <section class="empty-state">
      <h3>{{ title() | translate }}</h3>
      <p>{{ description() | translate }}</p>
    </section>
  `,
  styles: [
    `
      .empty-state {
        padding: 2rem;
        border: 1px dashed rgba(24, 77, 71, 0.2);
        border-radius: 1.5rem;
        background: rgba(255, 255, 255, 0.54);
        text-align: center;
      }
      h3 {
        margin-top: 0;
      }
      p {
        margin-bottom: 0;
        color: #516662;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
}

