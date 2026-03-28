import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'sn-page-header',
  standalone: true,
  imports: [TranslateModule],
  template: `
    <header class="page-header">
      <div>
        <p class="eyebrow">{{ eyebrow() | translate }}</p>
        <h2>{{ title() | translate }}</h2>
      </div>
      <p class="description">{{ description() | translate }}</p>
    </header>
  `,
  styles: [
    `
      .page-header {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: end;
        margin-bottom: 1rem;
      }
      .eyebrow {
        margin: 0 0 0.35rem;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: #16a34a;
        font-size: 0.76rem;
        font-weight: 700;
      }
      h2 {
        margin: 0;
        font-size: clamp(1.9rem, 2vw, 2.5rem);
        color: #111827;
      }
      .description {
        max-width: 30rem;
        margin: 0;
        color: #6b7280;
        line-height: 1.7;
      }
      @media (max-width: 760px) {
        .page-header {
          flex-direction: column;
          align-items: start;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeaderComponent {
  readonly eyebrow = input.required<string>();
  readonly title = input.required<string>();
  readonly description = input.required<string>();
}
