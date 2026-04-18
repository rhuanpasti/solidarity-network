import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

export interface DetailGridItem {
  label: string;
  value: string | number | null;
  fullWidth?: boolean;
  format?: 'date';
}

@Component({
  selector: 'app-detail-grid',
  standalone: true,
  imports: [TranslateModule, DatePipe],
  template: `
    <div class="detail-grid">
      @for (item of items(); track item.label) {
        <label class="field" [class.detail-grid-full]="item.fullWidth">
          <span>{{ item.label | translate }}</span>
          <div class="input detail-value">
            @if (item.format === 'date' && item.value) {
              {{ item.value | date: 'mediumDate' }}
            } @else {
              {{ item.value ?? fallback() }}
            }
          </div>
        </label>
      }
    </div>
  `,
  styleUrl: './detail-grid.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailGridComponent {
  readonly items = input<DetailGridItem[]>([]);
  readonly fallback = input('—');
}
