import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-generated-credential-card',
  standalone: true,
  imports: [TranslateModule],
  template: `
    <section class="generated-credential-card" aria-live="polite" [class.success]="tone() === 'success'">
      <div>
        <p class="generated-credential-card-eyebrow">{{ eyebrow() | translate }}</p>
        <strong>{{ name() }}</strong>
        <span>{{ email() }}</span>
      </div>

      <div class="generated-credential-card-secret">
        <small>{{ secretLabel() | translate }}</small>
        <strong>{{ secret() }}</strong>
      </div>
    </section>
  `,
  styleUrl: './generated-credential-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GeneratedCredentialCardComponent {
  readonly eyebrow = input.required<string>();
  readonly name = input.required<string>();
  readonly email = input.required<string>();
  readonly secretLabel = input.required<string>();
  readonly secret = input.required<string>();
  readonly tone = input<'info' | 'success'>('info');
}
