import { STORAGE_KEY } from '../utils/constants';
import { generateId } from '../utils/id';
import { sanitizeObject } from '../utils/url';
import type { JobApplication, LegacyJobApplication } from '../types/applications';
import { toWorkType, buildInitialTimeline } from '../utils/applications';

export const isLegacyApplication = (app: unknown): app is LegacyJobApplication => {
  return typeof app === 'object' && app !== null && !('timeline' in app);
};

export const migrateApplicationData = (legacyApp: LegacyJobApplication): JobApplication => {
  const timeline = buildInitialTimeline(
    legacyApp.applicationDate,
    legacyApp.status,
    legacyApp.interviewDate
  );

  return {
    ...legacyApp,
    workType: toWorkType(legacyApp.workType),
    timeline: timeline.length > 0 ? timeline : [
      {
        id: generateId(),
        type: 'application_submitted',
        date: legacyApp.applicationDate || new Date().toISOString().split('T')[0],
        status: 'completed',
      }
    ],
  };
};

export const getApplications = (): JobApplication[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];

    const rawApps = JSON.parse(data);
    if (!Array.isArray(rawApps)) return [];

    const migrated = rawApps.map((rawApp) => {
      const app = typeof rawApp === 'object' && rawApp !== null
        ? sanitizeObject(rawApp as Record<string, unknown>)
        : rawApp;

      if (app && typeof app === 'object' && 'status' in app && typeof app.status === 'string') {
        const s = app.status;
        if (s && /^[a-z]/.test(s)) {
          (app as JobApplication).status = s.charAt(0).toUpperCase() + s.slice(1);
        }
      }

      if (isLegacyApplication(app)) {
        return migrateApplicationData(app);
      }
      return app as JobApplication;
    });

    return migrated;
  } catch (error) {
    console.error("Error loading data from localStorage:", error);
    return [];
  }
};

export const saveApplications = (applications: JobApplication[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
  } catch (error) {
    console.error("Error saving data to localStorage:", error);
  }
};
