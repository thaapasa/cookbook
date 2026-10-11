import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { fi } from './locales/fi.ts';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof fi };
  }
}

void i18n.use(initReactI18next).init({
  lng: 'fi',
  fallbackLng: 'fi',
  resources: { fi: { translation: fi } },
  interpolation: { escapeValue: false },
});
