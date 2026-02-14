import { useMemo, useRef } from 'react';
import { type JobApplication } from '../types/applications';
import { type Filters } from '../components/FiltersBar';
import { parseLocalDate } from '../utils/date';

/**
 * Interface for applications with pre-calculated metadata for performance optimization.
 * ⚡ Bolt: Using a specialized interface helps optimize filtering and searching.
 */
export interface ApplicationWithMetadata extends JobApplication {
  parsedApplicationDate: Date | null;
  searchMetadata: string;
}

/**
 * Custom hook to process and filter job applications.
 *
 * It performs:
 * 1. Fused loop processing to extract unique statuses, platforms, and non-deleted apps.
 * 2. Pre-calculates metadata for optimized searching.
 * 3. Applies filters based on search term, status, platform, and date range.
 *
 * @param applications - List of all job applications
 * @param filters - Current filter settings
 * @returns Filtered applications and derived application data
 */
export const useFilteredApplications = (applications: JobApplication[], filters: Filters) => {
  // ⚡ Bolt: Referential cache for ApplicationWithMetadata objects.
  // By storing previously calculated metadata objects and associating them with
  // the original JobApplication reference, we can preserve object identity across
  // renders. This is crucial for preventing unnecessary re-renders of memoized
  // components like ApplicationTableRow and ApplicationCard.
  const cacheRef = useRef<Map<JobApplication, ApplicationWithMetadata>>(new Map());

  // ⚡ Bolt: Fused Loop for Application Processing
  // Instead of multiple separate loops (one for statuses, one for platforms, one for dates,
  // and one for non-deleted apps), we iterate over the `applications` array once.
  // We also pre-calculate a `searchMetadata` string for each application to optimize
  // the filtering process, especially for the search bar.
  const {
    applicationsWithMetadata,
    availableStatuses,
    availablePlatforms,
    nonDeletedApplications
  } = useMemo(() => {
    const statusesSet = new Set<string>();
    const platformsSet = new Set<string>();
    const nonDeleted: JobApplication[] = [];
    const newCache = new Map<JobApplication, ApplicationWithMetadata>();

    const withMetadata: ApplicationWithMetadata[] = applications.map(app => {
      // 1. Collect unique statuses and platforms
      if (app.status) statusesSet.add(app.status);
      if (app.platform) platformsSet.add(app.platform);

      // 2. Identify non-deleted applications
      if (app.status !== 'Deleted') {
        nonDeleted.push(app);
      }

      // 3. Check cache for existing metadata object
      // If the JobApplication reference is the same, we reuse the previous
      // ApplicationWithMetadata object to maintain referential identity.
      const existing = cacheRef.current.get(app);
      if (existing) {
        newCache.set(app, existing);
        return existing;
      }

      // 4. Pre-calculate searchable string (Search Metadata)
      // This combines all searchable fields into a single lowercase string
      // to avoid expensive mapping and multiple checks during every filter update.
      const timelineStr = app.timeline?.map(event =>
        `${event.notes ?? ''} ${event.customTypeName ?? ''} ${event.interviewerName ?? ''}`
      ).join(' ') || '';

      const searchMetadata = `${app.position ?? ''} ${app.company ?? ''} ${app.contactName ?? ''} ${app.notes ?? ''} ${timelineStr}`.toLowerCase();

      const result: ApplicationWithMetadata = {
        ...app,
        parsedApplicationDate: app.applicationDate ? parseLocalDate(app.applicationDate) : null,
        searchMetadata,
      };

      newCache.set(app, result);
      return result;
    });

    // Update the ref with the new cache to keep it fresh for the next calculation
    cacheRef.current = newCache;

    return {
      applicationsWithMetadata: withMetadata,
      availableStatuses: Array.from(statusesSet).sort((a, b) => a.localeCompare(b)),
      availablePlatforms: Array.from(platformsSet).sort((a, b) => a.localeCompare(b)),
      nonDeletedApplications: nonDeleted,
    };
  }, [applications]);

  const filteredApplications = useMemo(() => {
    const normalizedSearch = filters.search.trim().toLowerCase();
    const fromDate = filters.dateFrom ? parseLocalDate(filters.dateFrom) : null;
    const toDate = filters.dateTo ? parseLocalDate(filters.dateTo) : null;

    return applicationsWithMetadata.filter(app => {
      // Exclude deleted applications by default
      if (app.status === 'Deleted') {
        return false;
      }

      // ⚡ Bolt: Optimized Search Check
      // Using pre-calculated searchMetadata avoids expensive string operations
      // and timeline mapping inside the filter loop.
      const matchesSearch = normalizedSearch
        ? app.searchMetadata.includes(normalizedSearch)
        : true;

      // Advanced status filtering with include/exclude
      let matchesStatus = true;
      const statusInclude = filters.statusInclude || [];
      const statusExclude = filters.statusExclude || [];

      // If using legacy single status filter
      if (filters.status && statusInclude.length === 0 && statusExclude.length === 0) {
        matchesStatus = app.status === filters.status;
      } else {
        // New advanced filtering
        // If there are included statuses, app must be in that list
        if (statusInclude.length > 0) {
          matchesStatus = statusInclude.includes(app.status);
        }
        // Excluded statuses always take precedence
        if (statusExclude.length > 0 && statusExclude.includes(app.status)) {
          matchesStatus = false;
        }
      }

      const matchesPlatform = filters.platform ? app.platform === filters.platform : true;

      let matchesDateFrom = true;
      let matchesDateTo = true;

      if (fromDate) {
        matchesDateFrom = app.parsedApplicationDate ? app.parsedApplicationDate >= fromDate : false;
      }

      if (toDate) {
        matchesDateTo = app.parsedApplicationDate ? app.parsedApplicationDate <= toDate : false;
      }

      return matchesSearch && matchesStatus && matchesPlatform && matchesDateFrom && matchesDateTo;
    });
  }, [applicationsWithMetadata, filters]);

  return {
    filteredApplications,
    availableStatuses,
    availablePlatforms,
    nonDeletedApplications
  };
};
