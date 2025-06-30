import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { ru, en, kz } from './index';

const resources = {
  ru,
  en,
  kz,
};

const defult_language = localStorage.getItem('language') || 'en';

i18next.use(initReactI18next).init({
  resources,
  lng: defult_language,
  interpolation: {
    escapeValue: false,
  },
});
export default i18next;
