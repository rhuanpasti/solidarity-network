import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LoadingService } from '../../../core/services/loading.service';

@Component({
  selector: 'sn-global-loading',
  standalone: true,
  imports: [],
  templateUrl: './global-loading.component.html',
  styleUrl: './global-loading.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobalLoadingComponent {
  private readonly loadingService = inject(LoadingService);

  readonly isLoading = this.loadingService.isLoading;
}
