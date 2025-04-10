import { useTranslation } from 'react-i18next';

/**
 * A simple hook that wraps useTranslation to make it easier to use
 * @returns {Function} A translation function
 */
export default function useTranslate() {
  const { t, i18n } = useTranslation();
  
  return {
    t,
    i18n,
    changeLanguage: i18n.changeLanguage,
    currentLanguage: i18n.language
  };
}