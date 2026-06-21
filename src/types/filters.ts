// src/types/filters.ts

export interface Filters {
  search: string;
  status: string; // Legacy: single status filter (for backward compatibility)
  statusInclude: string[]; // Statuses to include (if empty, include all)
  statusExclude: string[]; // Statuses to exclude
  platform: string;
  dateFrom: string;
  dateTo: string;
}

export const defaultFilters: Filters = {
  search: '',
  status: '',
  statusInclude: [],
  statusExclude: [],
  platform: '',
  dateFrom: '',
  dateTo: '',
};
