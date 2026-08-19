import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-modal',
  imports: [TranslateModule],
  template: `
    <section class="modal-shell" [title]="tooltipText() | translate">
      <header class="modal-header">
        <div class="modal-heading">
          <h2 id="modal-title">{{ title() | translate }}</h2>
          <p>{{ description() | translate }}</p>
          @if (note(); as noteKey) {
            <small class="permission-note">{{ noteKey | translate }}</small>
          }
        </div>

        <button
          type="button"
          class="modal-close"
          [attr.aria-label]="'common.close' | translate"
          (click)="closed.emit()"
        >
          <span class="material-symbols-rounded" aria-hidden="true">close</span>
        </button>
      </header>

      @if (showReadonlyNote()) {
        <p class="form-readonly-note">{{ 'common.readOnlyDetails' | translate }}</p>
      }

      <div class="modal-actions">
        <ng-content select="[modalAction]" />
      </div>

      <div class="modal-body">
        <ng-content />
      </div>
    </section>
  `,
  styleUrl: './modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalComponent {
  readonly title = input.required<string>();
  readonly tooltip = input<string | null>(null);
  readonly description = input.required<string>();
  readonly note = input<string | null>(null);
  readonly showReadonlyNote = input(false);
  readonly closed = output<void>();
  readonly tooltipText = computed(() => this.tooltip() ?? this.title());
}
