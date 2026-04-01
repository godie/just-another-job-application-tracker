import { useTranslation } from 'react-i18next';
import { parseLocalDate } from '../utils/date';

/**
 * Hook for locale-aware date formatting.
 * Uses parseLocalDate to prevent timezone shifts and i18next for the current language.
 */
export function useFormatDate() {
  const { i18n } = useTranslation();

  const formatLocaleDate = (dateStr?: string | null): string => {
    if (!dateStr) return 'N/A';
    try {
      const date = parseLocalDate(dateStr);
      return date.toLocaleDateString(i18n.language, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatShortDate = (dateStr?: string | null): string => {
    if (!dateStr) return 'N/A';
    try {
      const date = parseLocalDate(dateStr);
      return date.toLocaleDateString(i18n.language, {
        dateStyle: 'short',
      });
    } catch {
      return dateStr;
    }
  };

  return {
    formatLocaleDate,
    formatShortDate,
  };
}
