import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from './langs/en.json';
import plTranslation from './langs/pl.json';

i18n
  // detect user language
  .use(LanguageDetector)
  // pass the i18n instance to react-i18next
  .use(initReactI18next)
  // init i18next
  .init({
    resources: {
      en: enTranslation,
      pl: plTranslation,
    },
    fallbackLng: 'en',
    debug: false,

    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },

    // detection options
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
  });

// Helper function to detect if browser language is supported and set it
const setBrowserLanguage = () => {
  const browserLang = navigator.language.split('-')[0]; // Get language code (e.g., 'en' from 'en-US')
  const supportedLanguages = ['en', 'pl'];
  
  if (supportedLanguages.includes(browserLang) && i18n.language !== browserLang) {
    i18n.changeLanguage(browserLang);
  }
};

// Call the function to set the browser language on initial load
setBrowserLanguage();

export default i18n;