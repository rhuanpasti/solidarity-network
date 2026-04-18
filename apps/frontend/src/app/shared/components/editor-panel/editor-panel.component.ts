import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-editor-panel',
  standalone: true,
  imports: [TranslateModule],
  template: `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h3>{{ title() | translate }}</h3>
          <p>{{ description() | translate }}</p>
          @if (note(); as noteKey) {
            <small class="permission-note">{{ noteKey | translate }}</small>
          }
        </div>
        <ng-content select="[panelAction]" />
      </div>

      @if (showReadonlyNote()) {
        <p class="form-readonly-note">{{ 'common.readOnlyDetails' | translate }}</p>
      }

      <ng-content />
    </section>
  `,
  styleUrl: './editor-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorPanelComponent {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly note = input<string | null>(null);
  readonly showReadonlyNote = input(false);
}
