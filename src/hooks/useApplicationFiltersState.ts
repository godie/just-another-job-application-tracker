import { useState, useCallback } from 'react';
import { type Filters } from '../types/filters';

const FILTERS_STORAGE_KEY = 'applicationFilters';

const defaultFilters: Filters = {
  search: '',
  status: '',
  statusInclude: [],
  statusExclude: [],
  platform: '',
  dateFrom: '',
  dateTo: '',
};

/**
 * Hook to manage job application filter state with localStorage persistence.
 */
export const useApplicationFiltersState = () => {
  // Initialize from localStorage synchronously
  const loadInitialFilters = (): Filters => {
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
  };

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
