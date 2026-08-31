export const SUPPORTED_LANGUAGES = ['en', 'es', 'pt-BR'] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export type AppLanguage = SupportedLanguage | 'auto';

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

export const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  auto: 'Auto (System)',
  en: 'English',
  es: 'Español',
  'pt-BR': 'Português (Brasil)',
};

const SUPPORTED_SET = new Set<string>(SUPPORTED_LANGUAGES);

export function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return typeof value === 'string' && SUPPORTED_SET.has(value);
}

export function isAppLanguage(value: unknown): value is AppLanguage {
  return value === 'auto' || isSupportedLanguage(value);
}

function normalizeLanguageTag(tag: string): SupportedLanguage | undefined {
  const lower = tag.toLowerCase();

  if (lower === 'pt-br' || lower === 'pt_br') return 'pt-BR';
  if (lower.startsWith('pt')) return 'pt-BR';
  if (lower.startsWith('es')) return 'es';
  if (lower.startsWith('en')) return 'en';

  return undefined;
}

export function getSystemLanguage(): SupportedLanguage {
  if (typeof navigator === 'undefined') return DEFAULT_LANGUAGE;

  const candidates: string[] = [];

  if (Array.isArray(navigator.languages) && navigator.languages.length > 0) {
    candidates.push(...navigator.languages);
  }

  if (typeof navigator.language === 'string' && navigator.language.length > 0) {
    candidates.push(navigator.language);
  }

  for (const tag of candidates) {
    const normalized = normalizeLanguageTag(tag);
    if (normalized) return normalized;
  }

  return DEFAULT_LANGUAGE;
}

export function resolveLanguage(appLanguage: AppLanguage): SupportedLanguage {
  if (appLanguage === 'auto') return getSystemLanguage();
  return appLanguage;
}

export function getLanguageDisplayName(language: AppLanguage, t?: (key: string) => string): string {
  if (language === 'auto' && t) {
    const translated = t('Common.Language.auto');
    if (translated !== 'Common.Language.auto') return translated;
  }
  return LANGUAGE_LABELS[language];
}
