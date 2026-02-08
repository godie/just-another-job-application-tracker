import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

export interface Filters {
  search: string;
  status: string; // Legacy: single status filter (for backward compatibility)
  statusInclude: string[]; // Statuses to include (if empty, include all)
  statusExclude: string[]; // Statuses to exclude
  platform: string;
  dateFrom: string;
  dateTo: string;
}

interface FiltersBarProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  availableStatuses: string[];
  availablePlatforms: string[];
  onClear: () => void;
}

const FiltersBar: React.FC<FiltersBarProps> = ({ filters, onFiltersChange, availableStatuses, availablePlatforms, onClear }) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState(filters.search);
  
  // Use refs to maintain stable references for the debounce effect
  // Update refs synchronously during render to ensure they're always current
  // This is safe because refs are mutable and don't trigger re-renders
  const filtersRef = useRef(filters);
  const onFiltersChangeRef = useRef(onFiltersChange);
  const isMountedRef = useRef(false);
  const lastSearchFromPropsRef = useRef(filters.search);
  
  filtersRef.current = filters;
  onFiltersChangeRef.current = onFiltersChange;

  // Sync searchTerm with filters.search when component mounts or when filters.search changes externally
  // This ensures the search field is restored when navigating back to the page
  useEffect(() => {
    // Always sync on mount to restore search term from localStorage
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      setSearchTerm(filters.search);
      lastSearchFromPropsRef.current = filters.search;
      return;
    }
    
    // Sync if filters.search changed externally (e.g., from localStorage restore)
    // Only update if it's different from our current searchTerm to avoid unnecessary updates
    if (filters.search !== lastSearchFromPropsRef.current && filters.search !== searchTerm) {
      setSearchTerm(filters.search);
      lastSearchFromPropsRef.current = filters.search;
    }
  }, [filters.search, searchTerm]);

  // Debounce: when searchTerm changes, wait 300ms then call onFiltersChange
  // Only update the search field, preserving other filter values
  useEffect(() => {
    // Skip debounce on mount to avoid unnecessary calls
    if (!isMountedRef.current) {
      return;
    }

    // Capture the current searchTerm value at the time the effect runs
    const currentSearchTerm = searchTerm;

    const timerId = setTimeout(() => {
      // Always update to ensure searchTerm is synced with parent filters
      onFiltersChangeRef.current({ ...filtersRef.current, search: currentSearchTerm });
      lastSearchFromPropsRef.current = currentSearchTerm;
    }, 300);

    return () => clearTimeout(timerId);
  }, [searchTerm]);

  const handleChange = (key: keyof Filters) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    onFiltersChange({ ...filters, [key]: event.target.value });
  };

  const handleStatusIncludeToggle = (status: string) => {
    const currentInclude = filters.statusInclude || [];
    const newInclude = currentInclude.includes(status)
      ? currentInclude.filter(s => s !== status)
      : [...currentInclude, status];
    onFiltersChange({ 
      ...filters, 
      statusInclude: newInclude,
      status: '' // Clear legacy status filter when using new system
    });
  };

  const handleStatusExcludeToggle = (status: string) => {
    const currentExclude = filters.statusExclude || [];
    const newExclude = currentExclude.includes(status)
      ? currentExclude.filter(s => s !== status)
      : [...currentExclude, status];
    onFiltersChange({ 
      ...filters, 
      statusExclude: newExclude,
      status: '' // Clear legacy status filter when using new system
    });
  };

  // Initialize arrays if they don't exist (for backward compatibility)
  const statusInclude = filters.statusInclude || [];
  const statusExclude = filters.statusExclude || [];

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-4 space-y-3">
      <div className="md:flex md:flex-wrap md:items-end md:gap-4">
        <div className="flex-1 min-w-[180px]">
          <label htmlFor="search" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">{t('filters.search')}</label>
          <input
            id="search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('filters.searchPlaceholder')}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        {/* Status filters - Advanced mode */}
        <div className="min-w-[200px] relative">
          <div className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">{t('filters.status')}</div>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <details className="group">
                <summary className="cursor-pointer text-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400">
                  {statusInclude.length > 0 ? t('filters.includeWithCount', { count: statusInclude.length }) : t('filters.include')}
                </summary>
                <div className="absolute mt-1 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2 bg-white dark:bg-gray-800 shadow-lg z-20 w-48">
                  {availableStatuses.map((status) => (
                    <label key={status} className="flex items-center gap-2 py-1.5 px-2 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900 rounded">
                      <input
                        id={`status-include-${status}`}
                        name={`status-include-${status}`}
                        type="checkbox"
                        checked={statusInclude.includes(status)}
                        onChange={() => handleStatusIncludeToggle(status)}
                        className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-gray-700"
                      />
                      <span className="text-xs text-gray-700 dark:text-gray-300">{t(`statuses.${status.toLowerCase()}`, status)}</span>
                    </label>
                  ))}
                </div>
              </details>
            </div>
            <div className="flex-1 relative">
              <details className="group">
                <summary className="cursor-pointer text-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400">
                  {statusExclude.length > 0 ? t('filters.excludeWithCount', { count: statusExclude.length }) : t('filters.exclude')}
                </summary>
                <div className="absolute mt-1 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2 bg-white dark:bg-gray-800 shadow-lg z-20 w-48">
                  {availableStatuses.map((status) => (
                    <label key={status} className="flex items-center gap-2 py-1.5 px-2 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900 rounded">
                      <input
                        id={`status-exclude-${status}`}
                        name={`status-exclude-${status}`}
                        type="checkbox"
                        checked={statusExclude.includes(status)}
                        onChange={() => handleStatusExcludeToggle(status)}
                        className="rounded border-gray-300 dark:border-gray-600 text-red-600 focus:ring-red-500 bg-white dark:bg-gray-700"
                      />
                      <span className="text-xs text-gray-700 dark:text-gray-300">{t(`statuses.${status.toLowerCase()}`, status)}</span>
                    </label>
                  ))}
                </div>
              </details>
            </div>
          </div>
          {(statusInclude.length > 0 || statusExclude.length > 0) && (
            <button
              type="button"
              onClick={() => onFiltersChange({ ...filters, statusInclude: [], statusExclude: [] })}
              className="mt-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline"
            >
              {t('filters.clearStatus')}
            </button>
          )}
        </div>

      <div className="min-w-[160px]">
        <label htmlFor="platform-filter" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">{t('filters.platform')}</label>
        <select
          id="platform-filter"
          value={filters.platform}
          onChange={handleChange('platform')}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">{t('filters.all')}</option>
          {availablePlatforms.map((platform) => (
            <option key={platform} value={platform}>{t(`form.platforms.${platform}`, platform)}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end gap-2">
        <div className="min-w-[140px]">
          <label htmlFor="date-from" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">{t('filters.from')}</label>
          <input
            id="date-from"
            type="date"
            value={filters.dateFrom}
            onChange={handleChange('dateFrom')}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        <div className="min-w-[140px]">
          <label htmlFor="date-to" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">{t('filters.to')}</label>
          <input
            id="date-to"
            type="date"
            value={filters.dateTo}
            onChange={handleChange('dateTo')}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
      </div>

        <div className="flex items-center gap-2 mt-2 md:mt-0">
          <button
            type="button"
            onClick={onClear}
            className="px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            {t('filters.clear')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FiltersBar;
