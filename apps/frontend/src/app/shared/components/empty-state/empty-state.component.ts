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
        border: 1px dashed #d1d5db;
        border-radius: 1.5rem;
        background: #f9fafb;
        text-align: center;
      }
      h3 {
        margin: 0;
        color: #111827;
      }
      p {
        margin: 0.65rem 0 0;
        color: #6b7280;
        line-height: 1.6;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
}
