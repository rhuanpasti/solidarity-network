import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-global-toast',
  standalone: true,
  imports: [TranslateModule],
  template: `
    @if (toastService.message(); as toast) {
      <div class="toast" role="status" aria-live="polite" [class.error]="toast.type === 'error'">
        @if (toast.translationKey) {
          {{ toast.translationKey | translate: toast.translationParams }}
        } @else {
          {{ toast.text }}
        }
      </div>
    }
  `,
  styleUrl: './global-toast.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobalToastComponent {
  readonly toastService = inject(ToastService);
}
