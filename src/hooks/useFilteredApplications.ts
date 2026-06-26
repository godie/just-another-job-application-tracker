import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type JobApplication, type ApplicationWithMetadata } from '../types/applications';
import { type Filters } from '../types/filters';
import { parseLocalDate } from '../utils/date';

/**
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

  const cacheRef = useRef<Map<JobApplication, ApplicationWithMetadata> | null>(null);
  const [currentTime] = useState(() => new Date());

  const availableStatusesRef = useRef<string[]>([]);
  const availablePlatformsRef = useRef<string[]>([]);
  const nonDeletedApplicationsRef = useRef<JobApplication[]>([]);
  const lastLanguageRef = useRef(i18n.language);

  if (cacheRef.current === null) {
    cacheRef.current = new Map();
  }
  const metadataCache = cacheRef.current;

  if (lastLanguageRef.current !== i18n.language) {
    cacheRef.current.clear();
    lastLanguageRef.current = i18n.language;
  }

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
      let currentStatus = app.status;
      if (currentStatus && /^[a-z]/.test(currentStatus)) {
        currentStatus = currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1);
      }

      if (currentStatus) statusesSet.add(currentStatus);
      if (app.platform) platformsSet.add(app.platform);

      if (app.status !== 'Deleted') {
        nonDeleted.push(app);
      }

      const existing = metadataCache.get(app);
      if (existing) {
        newCache.set(app, existing);
        return existing;
      }

      const timelineStr = app.timeline?.map(event =>
        `${event.notes ?? ''} ${event.customTypeName ?? ''} ${event.interviewerName ?? ''}`
      ).join(' ') || '';

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

      const sortedTimeline = app.timeline?.length > 0
        ? app.timeline.toSorted((a, b) =>
            parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime()
          )
        : [];

      const nextEvent = sortedTimeline.find(e =>
        (e.status === 'scheduled' || e.status === 'pending') && parseLocalDate(e.date) >= currentTime
      ) || null;

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

    cacheRef.current = newCache;

    const sortedStatuses = Array.from(statusesSet).sort((a, b) => a.localeCompare(b));
    if (sortedStatuses.join('|') !== availableStatusesRef.current.join('|')) {
      availableStatusesRef.current = sortedStatuses;
    }

    const sortedPlatforms = Array.from(platformsSet).sort((a, b) => a.localeCompare(b));
    if (sortedPlatforms.join('|') !== availablePlatformsRef.current.join('|')) {
      availablePlatformsRef.current = sortedPlatforms;
    }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cache invalidation on locale change; metadataCache is ref-backed.
    // react-doctor-disable-next-line exhaustive-deps -- i18n.language triggers cache invalidation on locale change; metadataCache is derived from cacheRef.current (ref-backed). All deps listed.
  }, [applications, t, currentTime, i18n.language, metadataCache]);

  const filteredApplications = useMemo(() => {
    const normalizedSearch = filters.search.trim().toLowerCase();
    const fromDate = filters.dateFrom ? parseLocalDate(filters.dateFrom) : null;
    const toDate = filters.dateTo ? parseLocalDate(filters.dateTo) : null;

    const statusIncludeSet = new Set(filters.statusInclude || []);
    const statusExcludeSet = new Set(filters.statusExclude || []);
    const hasStatusInclude = statusIncludeSet.size > 0;
    const hasStatusExclude = statusExcludeSet.size > 0;

    return applicationsWithMetadata.filter(app => {
      if (app.status === 'Deleted') {
        return false;
      }

      const matchesSearch = normalizedSearch
        ? app.searchMetadata.includes(normalizedSearch)
        : true;

      let matchesStatus = true;

      if (filters.status && !hasStatusInclude && !hasStatusExclude) {
        matchesStatus = app.status === filters.status;
      } else {
        if (hasStatusInclude) {
          matchesStatus = statusIncludeSet.has(app.status);
        }
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
