import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LanguageService } from './core/i18n/language.service';
import { GlobalLoadingComponent } from './shared/components/global-loading/global-loading.component';
import { GlobalToastComponent } from './shared/components/global-toast/global-toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, GlobalLoadingComponent, GlobalToastComponent],
  template: '<app-global-loading /> <router-outlet /> <app-global-toast />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private readonly languageService = inject(LanguageService);

  constructor() {
    this.languageService.initialize();
  }
}
