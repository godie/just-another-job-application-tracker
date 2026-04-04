// src/storage/preferences.ts
import { PREFERENCES_STORAGE_KEY, DEFAULT_PREFERENCES } from '../utils/constants';
import type { UserPreferences, ATSSearchPreferences } from '../types/preferences';

interface LegacyATSSearch {
  roles?: string[] | string;
  keywords?: string[] | string;
  location?: string[] | string;
}

interface StoredPreferences {
  enabledFields?: string[];
  columnOrder?: string[];
  customFields?: unknown[];
  defaultView?: string;
  dateFormat?: string;
  customInterviewEvents?: unknown[];
  atsSearch?: LegacyATSSearch;
  [key: string]: unknown;
}

const migrateAtsSearch = (atsSearch: LegacyATSSearch | undefined): ATSSearchPreferences => {
  if (!atsSearch) return DEFAULT_PREFERENCES.atsSearch!;

  const migrateField = (field: string[] | string | undefined): string[] => {
    if (Array.isArray(field)) return field;
    if (typeof field !== 'string') return [];

    return field
      .split(/ OR /i)
      .map(part => part.trim().replace(/^"(.*)"$/, '').replace(/^'(.*)'$/, ''))
      .filter(part => part.length > 0);
  };

  return {
    roles: migrateField(atsSearch.roles),
    keywords: migrateField(atsSearch.keywords),
    location: migrateField(atsSearch.location),
  };
};

export const getPreferences = (): UserPreferences => {
  try {
    const stored = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (!stored) {
      return DEFAULT_PREFERENCES;
    }
    const parsed: StoredPreferences = JSON.parse(stored);

    const enabledFields = parsed.enabledFields && parsed.enabledFields.length > 0
      ? parsed.enabledFields
      : DEFAULT_PREFERENCES.enabledFields;

    const columnOrder = parsed.columnOrder && parsed.columnOrder.length > 0
      ? parsed.columnOrder
      : DEFAULT_PREFERENCES.columnOrder;

    const customFields = parsed.customFields as UserPreferences['customFields'] ?? DEFAULT_PREFERENCES.customFields;
    
    const defaultView = (parsed.defaultView && ['table', 'timeline', 'kanban', 'calendar'].includes(parsed.defaultView))
      ? parsed.defaultView as UserPreferences['defaultView']
      : DEFAULT_PREFERENCES.defaultView;
    
    const dateFormat = (parsed.dateFormat && ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'].includes(parsed.dateFormat))
      ? parsed.dateFormat as UserPreferences['dateFormat']
      : DEFAULT_PREFERENCES.dateFormat;

    const customInterviewEvents = parsed.customInterviewEvents as UserPreferences['customInterviewEvents'] ?? DEFAULT_PREFERENCES.customInterviewEvents;

    const atsSearch = migrateAtsSearch(parsed.atsSearch);

    return {
      ...DEFAULT_PREFERENCES,
      enabledFields,
      columnOrder,
      customFields,
      defaultView,
      dateFormat,
      customInterviewEvents,
      atsSearch,
    };
  } catch (error) {
    console.error('Error loading preferences from localStorage:', error);
    return DEFAULT_PREFERENCES;
  }
};

export const savePreferences = (preferences: UserPreferences): void => {
  try {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error('Error saving preferences to localStorage:', error);
  }
};