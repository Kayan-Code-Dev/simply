import { useAuthStore } from '../store/authStore';
import { translations } from './translations';

export function useTranslation() {
  const { language, setLanguage } = useAuthStore();

  const t = (key) => {
    const localeDict = translations[language] || translations['en'];
    return localeDict[key] || key;
  };

  const dir = language === 'ar' ? 'rtl' : 'ltr';

  return { t, language, setLanguage, dir };
}
