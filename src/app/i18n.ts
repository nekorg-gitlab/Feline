import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getSettings } from './state/settings';
import { AppLanguage, resolveLanguage } from './utils/language';
import en from './locales/en.json';
import es from './locales/es.json';
import ptBR from './locales/pt-BR.json';

const resources = {
  en: { translation: en },
  es: { translation: es },
  'pt-BR': { translation: ptBR },
} as const;

const getInitialLanguage = (): string => {
  try {
    const settings = getSettings();
    return resolveLanguage(settings.language ?? 'auto');
  } catch {
    return 'en';
  }
};

i18n.use(initReactI18next).init({
  resources,
  lng: getInitialLanguage(),
  fallbackLng: 'en',
  supportedLngs: ['en', 'es', 'pt-BR'],
  nonExplicitSupportedLngs: false,
  interpolation: {
    escapeValue: false,
  },
  load: 'currentOnly',
  debug: false,
});

if (typeof document !== 'undefined') {
  document.documentElement.lang = i18n.language;
  i18n.on('languageChanged', (lng) => {
    document.documentElement.lang = lng;
  });
}

if (typeof window !== 'undefined') {
  const handleSystemLanguageChange = () => {
    try {
      const settings = getSettings();
      if (settings.language === 'auto') {
        const resolved = resolveLanguage('auto');
        if (resolved !== i18n.language) {
          i18n.changeLanguage(resolved);
        }
      }
    } catch {}
  };

  window.addEventListener('languagechange', handleSystemLanguageChange);
  window.addEventListener('storage', (evt) => {
    if (evt.key === 'settings') handleSystemLanguageChange();
  });
}

export function applyAppLanguage(language: AppLanguage): Promise<void> {
  const resolved = resolveLanguage(language);
  if (resolved === i18n.language) return Promise.resolve();
  return i18n.changeLanguage(resolved).then(() => undefined);
}

export default i18n;
