import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import {NativeModules, Platform} from 'react-native';

import ptBR from './locales/pt-BR.json';
import en from './locales/en.json';
import es from './locales/es.json';

// Get device language
const getDeviceLanguage = (): string => {
  let deviceLanguage = 'pt-BR';

  try {
    if (Platform.OS === 'ios') {
      deviceLanguage =
        NativeModules.SettingsManager?.settings?.AppleLocale ||
        NativeModules.SettingsManager?.settings?.AppleLanguages?.[0] ||
        'pt-BR';
    } else {
      deviceLanguage = NativeModules.I18nManager?.localeIdentifier || 'pt-BR';
    }
  } catch {
    deviceLanguage = 'pt-BR';
  }

  // Normalize language code
  if (deviceLanguage.startsWith('pt')) {
    return 'pt-BR';
  }
  if (deviceLanguage.startsWith('es')) {
    return 'es';
  }
  if (deviceLanguage.startsWith('en')) {
    return 'en';
  }

  return 'pt-BR';
};

export const SUPPORTED_LANGUAGES = {
  'pt-BR': 'Português (Brasil)',
  en: 'English',
  es: 'Español',
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

const resources = {
  'pt-BR': {translation: ptBR},
  en: {translation: en},
  es: {translation: es},
};

i18n.use(initReactI18next).init({
  resources,
  lng: getDeviceLanguage(),
  fallbackLng: 'pt-BR',
  compatibilityJSON: 'v3',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export const getLocale = (): string => i18n.language;

export const setLocale = (locale: SupportedLanguage): void => {
  i18n.changeLanguage(locale);
};

export default i18n;
