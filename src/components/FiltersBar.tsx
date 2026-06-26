import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from './ui/Input';
import { Select } from './ui/Select';

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

const FiltersBar: React.FC<FiltersBarProps> = React.memo(({ filters, onFiltersChange, availableStatuses, availablePlatforms, onClear }) => {
  const { t } = useTranslation();
  const initialSearchRef = useRef(filters.search);
  const [searchTerm, setSearchTerm] = useState(initialSearchRef.current);
  
  const filtersRef = useRef(filters);
  const onFiltersChangeRef = useRef(onFiltersChange);
  const isMountedRef = useRef(false);
  const lastSearchFromPropsRef = useRef(filters.search);
  
  filtersRef.current = filters;
  onFiltersChangeRef.current = onFiltersChange;

  const syncSearchTermToCanonicalProp = (canonical: string) => {
    setSearchTerm(canonical);
    lastSearchFromPropsRef.current = canonical;
  };

  useEffect(() => {
    const currentSearchTerm = searchTerm;
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      lastSearchFromPropsRef.current = filters.search;
      return;
    }

    if (filters.search !== lastSearchFromPropsRef.current && filters.search !== currentSearchTerm) {
      // react-doctor-disable-next-line no-derived-state,no-chain-state-updates
      syncSearchTermToCanonicalProp(filters.search);
    }
  }, [filters.search, searchTerm]);

  useEffect(() => {
    if (!isMountedRef.current) {
      return;
    }

    const currentSearchTerm = searchTerm;

    const timerId = setTimeout(() => {
      onFiltersChangeRef.current({ ...filtersRef.current, search: currentSearchTerm });
      lastSearchFromPropsRef.current = currentSearchTerm;
    }, 300);

    return () => clearTimeout(timerId);
  }, [searchTerm]);

  const createFilterChangeHandler = (key: keyof Filters) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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

  const statusInclude = filters.statusInclude || [];
  const statusExclude = filters.statusExclude || [];

  return (
    <div className='flex flex-wrap items-end gap-3 sm:gap-4 py-3 border-b border-border dark:border-border'>
      <div className='flex-1 min-w-[160px]'>
        <Input
          id='search'
          label={t('filters.search')}
          type='text'
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t('filters.searchPlaceholder')}
        />
      </div>

      {/* Status filters - Advanced mode */}
      <div className='min-w-[200px] relative'>
        <div className='block text-xs font-semibold text-muted-foreground mb-2'>{t('filters.status')}</div>
        <div className='flex gap-3'>
          <div className='flex-1 relative'>
            <details className='group'>
              <summary className='cursor-pointer text-xs px-3 py-2 border border-input rounded bg-muted hover:bg-accent text-foreground hover:text-accent-foreground transition-colors'>
                {statusInclude.length > 0 ? t('filters.includeWithCount', { count: statusInclude.length }) : t('filters.include')}
              </summary>
              <div className='absolute mt-1 max-h-48 overflow-y-auto border border-border rounded p-2 bg-popover shadow-lg z-20 w-48'>
                {availableStatuses.map((status) => (
                  <label key={status} className='flex items-center gap-2 py-1.5 px-2 cursor-pointer hover:bg-accent rounded transition-colors'>
                    <input
                      id={`status-include-${status}`}
                      name={`status-include-${status}`}
                      type='checkbox'
                      checked={statusInclude.includes(status)}
                      onChange={() => handleStatusIncludeToggle(status)}
                      className='rounded border-input text-primary focus:ring-ring bg-background'
                      aria-label={t(`statuses.${status.toLowerCase()}`, status)}
                    />
                    <span className='text-xs text-foreground'>{t(`statuses.${status.toLowerCase()}`, status)}</span>
                  </label>
                ))}
              </div>
            </details>
          </div>
          <div className='flex-1 relative'>
            <details className='group'>
              <summary className='cursor-pointer text-xs px-3 py-2 border border-input rounded bg-muted hover:bg-destructive/10 text-foreground hover:text-destructive transition-colors'>
                {statusExclude.length > 0 ? t('filters.excludeWithCount', { count: statusExclude.length }) : t('filters.exclude')}
              </summary>
              <div className='absolute mt-1 max-h-48 overflow-y-auto border border-border rounded p-2 bg-popover shadow-lg z-20 w-48'>
                {availableStatuses.map((status) => (
                  <label key={status} className='flex items-center gap-2 py-1.5 px-2 cursor-pointer hover:bg-destructive/10 rounded transition-colors'>
                    <input
                      id={`status-exclude-${status}`}
                      name={`status-exclude-${status}`}
                      type='checkbox'
                      checked={statusExclude.includes(status)}
                      onChange={() => handleStatusExcludeToggle(status)}
                      className='rounded border-input text-destructive focus:ring-destructive bg-background'
                      aria-label={`${t('filters.exclude')}: ${t(`statuses.${status.toLowerCase()}`, status)}`}
                    />
                    <span className='text-xs text-foreground'>{t(`statuses.${status.toLowerCase()}`, status)}</span>
                  </label>
                ))}
              </div>
            </details>
          </div>
        </div>
        {(statusInclude.length > 0 || statusExclude.length > 0) && (
          <button
            type='button'
            onClick={() => onFiltersChange({ ...filters, statusInclude: [], statusExclude: [] })}
            className='mt-2 text-xs text-muted-foreground hover:text-foreground underline transition-colors'
          >
            {t('filters.clearStatus')}
          </button>
        )}
      </div>

      <div className='min-w-[160px]'>
        <Select
          id='platform-filter'
          label={t('filters.platform')}
          value={filters.platform}
          onChange={createFilterChangeHandler('platform')}
        >
          <option value=''>{t('filters.all')}</option>
          {availablePlatforms.map((platform) => (
            <option key={platform} value={platform}>{t(`form.platforms.${platform}`, platform)}</option>
          ))}
        </Select>
      </div>

      <div className='flex items-end gap-3'>
        <div className='min-w-[140px]'>
          <Input
            id='date-from'
            label={t('filters.from')}
            type='date'
            value={filters.dateFrom}
            onChange={createFilterChangeHandler('dateFrom')}
          />
        </div>
        <div className='min-w-[140px]'>
          <Input
            id='date-to'
            label={t('filters.to')}
            type='date'
            value={filters.dateTo}
            onChange={createFilterChangeHandler('dateTo')}
          />
        </div>
      </div>

      <div className='flex items-center gap-2'>
        <button
          type='button'
          onClick={onClear}
          className='text-xs font-medium text-muted-foreground hover:text-foreground transition-colors'
        >
          {t('filters.clear')}
        </button>
      </div>
    </div>
  );
});

export default FiltersBar;