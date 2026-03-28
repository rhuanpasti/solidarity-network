import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ShellComponent } from './core/layout/shell.component';
import { LanguageService } from './core/i18n/language.service';

@Component({
  selector: 'sn-root',
  standalone: true,
  imports: [ShellComponent],
  template: '<sn-shell />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private readonly languageService = inject(LanguageService);

  constructor() {
    this.languageService.initialize();
  }
}

