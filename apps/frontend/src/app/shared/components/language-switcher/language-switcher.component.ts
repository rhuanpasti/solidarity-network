import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  template: `
    <div class="language-switcher">
      @for (language of languages(); track language.value) {
        <button
          type="button"
          class="language-button"
          [class.active]="currentLanguage() === language.value"
          (click)="languageChange.emit(language.value)"
        >
          {{ language.label }}
        </button>
      }
    </div>
  `,
  styleUrl: './language-switcher.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageSwitcherComponent {
  readonly currentLanguage = input.required<string>();
  readonly languages = input([
    { value: 'en', label: 'EN' },
    { value: 'pt-br', label: 'PT-BR' },
  ]);
  readonly languageChange = output<string>();
}
