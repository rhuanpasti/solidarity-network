import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [TranslateModule],
  template: `
    <header class="page-header">
      <div>
        <p class="eyebrow">{{ eyebrow() | translate }}</p>
        <h2>{{ title() | translate }}</h2>
      </div>
      <div class="header-actions">
        <p class="description">{{ description() | translate }}</p>
        @if (showRefresh()) {
          <button
            type="button"
            class="refresh-button"
            [disabled]="refreshDisabled()"
            [attr.aria-label]="'common.refresh' | translate"
            (click)="refresh.emit()"
          >
            <span class="material-symbols-rounded" aria-hidden="true">refresh</span>
            {{ (refreshing() ? 'common.refreshing' : 'common.refresh') | translate }}
            @if (refreshCooldownSeconds() > 0) {
              <small>({{ refreshCooldownSeconds() }}s)</small>
            }
          </button>
        }
      </div>
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
      .header-actions {
        display: flex;
        align-items: end;
        gap: 0.75rem;
      }
      .refresh-button {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        min-height: 2.5rem;
        padding: 0.55rem 0.8rem;
        border: 1px solid #d1d5db;
        border-radius: 0.75rem;
        background: #ffffff;
        color: #374151;
        font: inherit;
        font-size: 0.85rem;
        font-weight: 700;
        cursor: pointer;
      }
      .refresh-button:hover:not(:disabled) {
        border-color: #16a34a;
        color: #15803d;
      }
      .refresh-button:disabled {
        cursor: wait;
        opacity: 0.55;
      }
      .refresh-button small {
        font-size: 0.72rem;
        font-weight: 500;
      }
      @media (max-width: 760px) {
        .page-header {
          flex-direction: column;
          align-items: start;
        }
        .header-actions {
          width: 100%;
          align-items: start;
          flex-direction: column;
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
  readonly showRefresh = input(false);
  readonly refreshing = input(false);
  readonly refreshDisabled = input(false);
  readonly refreshCooldownSeconds = input(0);
  readonly refresh = output<void>();
}
