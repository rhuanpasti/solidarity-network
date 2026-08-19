import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [TranslateModule],
  styleUrl: './page-header.component.scss',
  template: `
    <header class="page-header" [title]="tooltipText() | translate">
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeaderComponent {
  readonly eyebrow = input.required<string>();
  readonly title = input.required<string>();
  readonly tooltip = input<string | null>(null);
  readonly description = input.required<string>();
  readonly showRefresh = input(false);
  readonly refreshing = input(false);
  readonly refreshDisabled = input(false);
  readonly refreshCooldownSeconds = input(0);
  readonly refresh = output<void>();
  readonly tooltipText = computed(() => this.tooltip() ?? this.title());
}
