import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { type UserPreferences } from '../types/preferences';
import { type TableColumn } from '../types/table';
import { DEFAULT_FIELDS } from '../utils/constants';

/**
 * Custom hook to generate table column configurations based on user preferences.
 *
 * It combines default fields with custom fields, filters by enabled fields,
 * and applies the preferred column order. All labels are translated.
 *
 * @param preferences - User preferences containing field settings and order
 * @returns An array of TableColumn objects
 */
export const useTableColumns = (preferences: UserPreferences | null): TableColumn[] => {
  const { t } = useTranslation();

  return useMemo(() => {
    const buildColumn = (id: string, fallbackLabel: string): TableColumn => ({
      id,
      label: t(`fields.${id}`, fallbackLabel),
    });

    if (!preferences) {
      return DEFAULT_FIELDS.map((field) => buildColumn(field.id, field.label));
    }

    const enabledSet = new Set(preferences.enabledFields);

    const fieldById = new Map<string, TableColumn>();
    DEFAULT_FIELDS.forEach((field) => {
      fieldById.set(field.id, buildColumn(field.id, field.label));
    });
    preferences.customFields.forEach((field) => {
      fieldById.set(field.id, { id: field.id, label: field.label });
    });

    return preferences.columnOrder
      .filter((id) => enabledSet.has(id))
      .map((id) => fieldById.get(id))
      .filter((column): column is TableColumn => Boolean(column));
  }, [preferences, t]);
};
