import { useState, useCallback } from 'react';
import { type Filters, defaultFilters } from '../types/filters';

const FILTERS_STORAGE_KEY = 'applicationFilters';

/**
 * Loads filters from localStorage or returns default values.
 */
function loadInitialFilters(): Filters {
  if (typeof window === 'undefined') return defaultFilters;
  const storedFilters = window.localStorage.getItem(FILTERS_STORAGE_KEY);
  if (storedFilters) {
    try {
      const parsed = JSON.parse(storedFilters) as Filters;
      return { ...defaultFilters, ...parsed };
    } catch {
      return defaultFilters;
    }
  }
  return defaultFilters;
}

/**
 * Custom hook to manage job application filters state and persistence.
 */
export const useApplicationFiltersState = () => {
  const [filters, setFilters] = useState<Filters>(loadInitialFilters);

  const handleFiltersChange = useCallback((nextFilters: Filters) => {
    setFilters(nextFilters);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(nextFilters));
    }
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters(defaultFilters);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(FILTERS_STORAGE_KEY);
    }
  }, []);

  return {
    filters,
    handleFiltersChange,
    handleClearFilters,
  };
};
