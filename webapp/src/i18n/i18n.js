import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already does escaping
    },
    resources: {
      en: {
        translation: require('./locals/en.json'),
      },
      es: {
        translation: require('./locals/es.json'),
      },
    },
  });

export default i18n;