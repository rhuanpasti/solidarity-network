import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

const LANGUAGE_STORAGE_KEY = 'solidarity-network-language';
const PORTUGUESE_LANGUAGE = 'pt-br';
const ENGLISH_LANGUAGE = 'en';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translateService = inject(TranslateService);
  readonly currentLanguage = signal(ENGLISH_LANGUAGE);
  readonly supportedLanguages = [ENGLISH_LANGUAGE, PORTUGUESE_LANGUAGE] as const;

  initialize() {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    const browserLanguage = navigator.language.toLowerCase().startsWith('pt')
      ? PORTUGUESE_LANGUAGE
      : ENGLISH_LANGUAGE;
    const language = stored && this.isSupported(stored) ? stored : browserLanguage;

    this.translateService.addLangs([...this.supportedLanguages]);
    this.translateService.setFallbackLang(ENGLISH_LANGUAGE);
    this.translateService.use(language);
    this.currentLanguage.set(language);
    document.documentElement.lang =
      language === PORTUGUESE_LANGUAGE ? 'pt-BR' : ENGLISH_LANGUAGE;
  }

  setLanguage(language: string) {
    if (!this.isSupported(language)) {
      return;
    }

    this.translateService.use(language);
    this.currentLanguage.set(language);
    document.documentElement.lang =
      language === PORTUGUESE_LANGUAGE ? 'pt-BR' : ENGLISH_LANGUAGE;
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }

  private isSupported(language: string): language is (typeof this.supportedLanguages)[number] {
    return this.supportedLanguages.includes(language as never);
  }
}
