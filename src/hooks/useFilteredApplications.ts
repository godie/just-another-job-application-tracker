import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { type JobApplication, type ApplicationWithMetadata } from '../types/applications';
import { type Filters } from '../components/FiltersBar';
import { parseLocalDate } from '../utils/date';

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
  const { t, i18n } = useTranslation();

  // ⚡ Bolt: Referential cache for ApplicationWithMetadata objects.
  // By storing previously calculated metadata objects and associating them with
  // the original JobApplication reference, we can preserve object identity across
  // renders. This is crucial for preventing unnecessary re-renders of memoized
  // components like ApplicationTableRow and ApplicationCard.
  const cacheRef = useRef<Map<JobApplication, ApplicationWithMetadata>>(new Map());

  // ⚡ Bolt: Stability refs for derived data.
  // These refs allow us to maintain referential identity for arrays like
  // availableStatuses and availablePlatforms even when their contents haven't
  // changed, preventing unnecessary re-renders of downstream components
  // like FiltersBar and GoogleSheetsSync.
  const availableStatusesRef = useRef<string[]>([]);
  const availablePlatformsRef = useRef<string[]>([]);
  const nonDeletedApplicationsRef = useRef<JobApplication[]>([]);
  const lastLanguageRef = useRef(i18n.language);

  // ⚡ Bolt: Language-aware cache invalidation.
  // If the language changes, we must clear the cache to ensure all translated
  // fields are re-calculated correctly for the new locale.
  if (lastLanguageRef.current !== i18n.language) {
    cacheRef.current.clear();
    lastLanguageRef.current = i18n.language;
  }

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
      // ⚡ Bolt: Normalize status to Capitalized format to prevent duplicates in filters.
      // We use a local variable to avoid mutating the original JobApplication object.
      let currentStatus = app.status;
      if (currentStatus && /^[a-z]/.test(currentStatus)) {
        currentStatus = currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1);
      }

      // 1. Collect unique statuses and platforms
      if (currentStatus) statusesSet.add(currentStatus);
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
      const timelineStr = app.timeline?.map(event =>
        `${event.notes ?? ''} ${event.customTypeName ?? ''} ${event.interviewerName ?? ''}`
      ).join(' ') || '';

      // 5. Pre-calculate translations and sub-status
      // ⚡ Bolt: Moving translations and expensive logic (like timeline sorting)
      // into this pre-calculation step ensures they only run once per change,
      // significantly improving rendering performance for large lists and Kanban boards.
      const translatedStatus = currentStatus ? t(`statuses.${currentStatus.toLowerCase()}`, currentStatus) : '';
      const translatedPlatform = app.platform ? t(`form.platforms.${app.platform}`, app.platform) : '';

      let translatedWorkType = '';
      if (app.workType) {
        const workTypeKey = app.workType === 'on-site' ? 'onSite' : app.workType;
        translatedWorkType = t(`form.workTypes.${workTypeKey}`, app.workType);
        if (app.workType === 'hybrid' && typeof app.hybridDaysInOffice === 'number') {
          translatedWorkType += ` (${t('form.hybridDaysOption', { count: app.hybridDaysInOffice })})`;
        }
      }

      // ⚡ Bolt: Pre-calculating sorted timeline and next event here ensures
      // O(n log n) operations run only once per change, benefiting Kanban,
      // Timeline, and Table views.
      const sortedTimeline = app.timeline?.length > 0
        ? [...app.timeline].sort((a, b) =>
            parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime()
          )
        : [];

      const now = new Date();
      const nextEvent = sortedTimeline.find(e =>
        (e.status === 'scheduled' || e.status === 'pending') && parseLocalDate(e.date) >= now
      ) || null;

      // Calculate Interviewing Sub-status (Logic moved from KanbanView for performance)
      let interviewingSubStatus: string | null = null;
      if (app.status === 'Interviewing' && sortedTimeline.length > 0) {
        const formatType = (type: string) => t(`insights.interviewTypes.${type}`, type.replace(/_/g, ' '));

        if (nextEvent) {
          interviewingSubStatus = nextEvent.type === 'custom' && nextEvent.customTypeName
            ? nextEvent.customTypeName : formatType(nextEvent.type);
        } else {
          const completed = sortedTimeline.filter(e => e.status === 'completed').reverse();
          if (completed.length > 0) {
            interviewingSubStatus = completed[0].type === 'custom' && completed[0].customTypeName
              ? completed[0].customTypeName : formatType(completed[0].type);
          }
        }
      }

      const searchMetadata = `${app.position ?? ''} ${app.company ?? ''} ${app.contactName ?? ''} ${app.notes ?? ''} ${translatedStatus} ${translatedPlatform} ${timelineStr}`.toLowerCase();

      const result: ApplicationWithMetadata = {
        ...app,
        status: currentStatus,
        parsedApplicationDate: app.applicationDate ? parseLocalDate(app.applicationDate) : null,
        searchMetadata,
        translatedStatus,
        translatedPlatform,
        translatedWorkType,
        interviewingSubStatus,
        sortedTimeline,
        nextEvent,
      };

      newCache.set(app, result);
      return result;
    });

    // Update the ref with the new cache to keep it fresh for the next calculation
    cacheRef.current = newCache;

    // ⚡ Bolt: Referential stability check for filter options.
    // By checking if the new sets of statuses/platforms are the same as before,
    // we can reuse the previous array reference and avoid re-rendering FiltersBar.
    const sortedStatuses = Array.from(statusesSet).sort((a, b) => a.localeCompare(b));
    if (sortedStatuses.join('|') !== availableStatusesRef.current.join('|')) {
      availableStatusesRef.current = sortedStatuses;
    }

    const sortedPlatforms = Array.from(platformsSet).sort((a, b) => a.localeCompare(b));
    if (sortedPlatforms.join('|') !== availablePlatformsRef.current.join('|')) {
      availablePlatformsRef.current = sortedPlatforms;
    }

    // ⚡ Bolt: Referential stability check for non-deleted applications.
    // This allows memoized components like GoogleSheetsSync to skip deep
    // comparisons if the contents of the array are referentially identical.
    const nonDeletedChanged = nonDeleted.length !== nonDeletedApplicationsRef.current.length ||
      nonDeleted.some((app, i) => app !== nonDeletedApplicationsRef.current[i]);

    if (nonDeletedChanged) {
      nonDeletedApplicationsRef.current = nonDeleted;
    }

    return {
      applicationsWithMetadata: withMetadata,
      availableStatuses: availableStatusesRef.current,
      availablePlatforms: availablePlatformsRef.current,
      nonDeletedApplications: nonDeletedApplicationsRef.current,
    };
  }, [applications, t]);

  const filteredApplications = useMemo(() => {
    const normalizedSearch = filters.search.trim().toLowerCase();
    const fromDate = filters.dateFrom ? parseLocalDate(filters.dateFrom) : null;
    const toDate = filters.dateTo ? parseLocalDate(filters.dateTo) : null;

    // ⚡ Bolt: Optimized filter preparation.
    // Creating Sets outside the loop ensures O(1) lookups during iteration,
    // significantly improving performance for complex inclusion/exclusion logic.
    const statusIncludeSet = new Set(filters.statusInclude || []);
    const statusExcludeSet = new Set(filters.statusExclude || []);
    const hasStatusInclude = statusIncludeSet.size > 0;
    const hasStatusExclude = statusExcludeSet.size > 0;

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

      // If using legacy single status filter
      if (filters.status && !hasStatusInclude && !hasStatusExclude) {
        matchesStatus = app.status === filters.status;
      } else {
        // New advanced filtering
        // If there are included statuses, app must be in that list
        if (hasStatusInclude) {
          matchesStatus = statusIncludeSet.has(app.status);
        }
        // Excluded statuses always take precedence
        if (hasStatusExclude && statusExcludeSet.has(app.status)) {
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
