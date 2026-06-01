// src/utils/mergeData.ts
import type { JobApplication } from '../types/applications';
import type { JobOpportunity } from '../types/opportunities';
import { parseLocalDate } from './date';

/**
 * Convert a date string to a numeric timestamp for comparison.
 * Returns 0 for empty/falsy strings so records with dates always win over empty ones.
 */
const toTimestamp = (d: string): number => (d ? parseLocalDate(d).getTime() : 0);

/**
 * Get the most recent date from a JobApplication for conflict resolution.
 * Uses the latest timeline event date, falling back to applicationDate.
 */
function getAppLatestDate(app: JobApplication): string {
  if (app.timeline && app.timeline.length > 0) {
    const dates = app.timeline
      .flatMap((e) => e.date ? [e.date] : [])
      .sort((a, b) => toTimestamp(b) - toTimestamp(a));
    if (dates.length > 0) return dates[0];
  }
  return app.applicationDate || '';
}

/**
 * Get the most recent date from a JobOpportunity for conflict resolution.
 * Uses postedDate falling back to capturedDate.
 */
function getOppLatestDate(opp: JobOpportunity): string {
  return opp.postedDate || opp.capturedDate || '';
}

/**
 * Merge two arrays of JobApplications by ID.
 * For records with the same ID: keep the one with the most recent date.
 * For records that only exist in one source: include them.
 */
export function mergeApplications(
  local: JobApplication[],
  cloud: JobApplication[]
): JobApplication[] {
  const localMap = new Map<string, JobApplication>();
  const cloudMap = new Map<string, JobApplication>();

  for (const app of local) {
    localMap.set(app.id, app);
  }
  for (const app of cloud) {
    cloudMap.set(app.id, app);
  }

  const merged: JobApplication[] = [];

  // Process all IDs from both sources (Set already deduplicates)
  for (const id of new Set([...localMap.keys(), ...cloudMap.keys()])) {
    const localApp = localMap.get(id);
    const cloudApp = cloudMap.get(id);

    if (localApp && cloudApp) {
      // Both exist: keep the one with the most recent date
      const localDate = getAppLatestDate(localApp);
      const cloudDate = getAppLatestDate(cloudApp);

      if (toTimestamp(cloudDate) > toTimestamp(localDate)) {
        merged.push(cloudApp);
      } else {
        merged.push(localApp);
      }
    } else if (localApp) {
      merged.push(localApp);
    } else if (cloudApp) {
      merged.push(cloudApp);
    }
  }

  return merged;
}

/**
 * Merge two arrays of JobOpportunities by ID.
 * For records with the same ID: keep the one with the most recent date.
 * For records that only exist in one source: include them.
 */
export function mergeOpportunities(
  local: JobOpportunity[],
  cloud: JobOpportunity[]
): JobOpportunity[] {
  const localMap = new Map<string, JobOpportunity>();
  const cloudMap = new Map<string, JobOpportunity>();

  for (const opp of local) {
    localMap.set(opp.id, opp);
  }
  for (const opp of cloud) {
    cloudMap.set(opp.id, opp);
  }

  const merged: JobOpportunity[] = [];

  for (const id of new Set([...localMap.keys(), ...cloudMap.keys()])) {
    const localOpp = localMap.get(id);
    const cloudOpp = cloudMap.get(id);

    if (localOpp && cloudOpp) {
      const localDate = getOppLatestDate(localOpp);
      const cloudDate = getOppLatestDate(cloudOpp);

      if (toTimestamp(cloudDate) > toTimestamp(localDate)) {
        merged.push(cloudOpp);
      } else {
        merged.push(localOpp);
      }
    } else if (localOpp) {
      merged.push(localOpp);
    } else if (cloudOpp) {
      merged.push(cloudOpp);
    }
  }

  return merged;
}

export type MergeStrategy = 'useCloud' | 'keepLocal' | 'merge';

export interface MergeData {
  applications: JobApplication[];
  opportunities: JobOpportunity[];
}

/**
 * Resolve a merge conflict using the chosen strategy.
 * Returns the final data to apply locally and push to cloud.
 */
export function resolveMerge(
  strategy: MergeStrategy,
  localData: MergeData,
  cloudData: MergeData
): MergeData {
  switch (strategy) {
    case 'useCloud':
      return {
        applications: cloudData.applications,
        opportunities: cloudData.opportunities,
      };
    case 'keepLocal':
      return {
        applications: localData.applications,
        opportunities: localData.opportunities,
      };
    case 'merge':
      return {
        applications: mergeApplications(
          localData.applications,
          cloudData.applications
        ),
        opportunities: mergeOpportunities(
          localData.opportunities,
          cloudData.opportunities
        ),
      };
  }
}
