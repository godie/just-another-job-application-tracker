// src/storage/preferences.ts
import { PREFERENCES_STORAGE_KEY, DEFAULT_PREFERENCES } from '../utils/constants';
import type { UserPreferences } from '../types/preferences';

/**
 * Obtiene las preferencias del usuario desde localStorage.
 */
export const getPreferences = (): UserPreferences => {
  try {
    const stored = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (!stored) {
      return DEFAULT_PREFERENCES;
    }
    const parsed = JSON.parse(stored) as Partial<UserPreferences>;

    // Merge with defaults to be resilient to schema changes
    const enabledFields = parsed.enabledFields && parsed.enabledFields.length > 0
      ? parsed.enabledFields
      : DEFAULT_PREFERENCES.enabledFields;

    const columnOrder = parsed.columnOrder && parsed.columnOrder.length > 0
      ? parsed.columnOrder
      : DEFAULT_PREFERENCES.columnOrder;

    const customFields = parsed.customFields ?? DEFAULT_PREFERENCES.customFields;
    
    const defaultView = (parsed.defaultView && ['table', 'timeline', 'kanban', 'calendar'].includes(parsed.defaultView))
      ? parsed.defaultView
      : DEFAULT_PREFERENCES.defaultView;
    
    const dateFormat = (parsed.dateFormat && ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'].includes(parsed.dateFormat))
      ? parsed.dateFormat
      : DEFAULT_PREFERENCES.dateFormat;

    const customInterviewEvents = parsed.customInterviewEvents ?? DEFAULT_PREFERENCES.customInterviewEvents;

    const atsSearch = parsed.atsSearch ?? DEFAULT_PREFERENCES.atsSearch;

    return {
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

/**
 * Guarda las preferencias del usuario en localStorage.
 */
export const savePreferences = (preferences: UserPreferences): void => {
  try {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error('Error saving preferences to localStorage:', error);
  }
};

