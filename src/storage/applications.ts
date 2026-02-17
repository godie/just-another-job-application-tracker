// src/storage/applications.ts
import { STORAGE_KEY } from '../utils/constants';
import { generateId } from '../utils/id';
import { sanitizeObject } from '../utils/url';
import type { JobApplication, LegacyJobApplication, InterviewEvent, InterviewStageType, WorkType } from '../types/applications';

const WORK_TYPES: WorkType[] = ['remote', 'on-site', 'hybrid'];

const toWorkType = (s: string | undefined): WorkType | undefined =>
  s && WORK_TYPES.includes(s as WorkType) ? (s as WorkType) : undefined;

/**
 * Helper function to map legacy status to interview stage type
 */
const mapStatusToStageType = (status: string): InterviewStageType => {
  const statusMap: Record<string, InterviewStageType> = {
    'Applied': 'application_submitted',
    'Interviewing': 'technical_interview',
    'Offer': 'offer',
    'Rejected': 'rejected',
    'Withdrawn': 'withdrawn',
  };
  return statusMap[status] || 'application_submitted';
};

/**
 * Check if an application is in legacy format
 */
const isLegacyApplication = (app: unknown): app is LegacyJobApplication => {
  return typeof app === 'object' && app !== null && !('timeline' in app);
};

/**
 * Migrate legacy application data to new format
 */
export const migrateApplicationData = (legacyApp: LegacyJobApplication): JobApplication => {
  const timeline: InterviewEvent[] = [];
  
  // Add application submitted event if date exists
  if (legacyApp.applicationDate) {
    timeline.push({
      id: generateId(),
      type: 'application_submitted',
      date: legacyApp.applicationDate,
      status: 'completed',
    });
  }
  
  // Add interview event if date exists
  if (legacyApp.interviewDate) {
    timeline.push({
      id: generateId(),
      type: mapStatusToStageType(legacyApp.status),
      date: legacyApp.interviewDate,
      status: 'scheduled',
    });
  }
  
  // Create new application with timeline
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

/**
 * Obtiene las aplicaciones guardadas o un array vacío si no hay datos.
 * Automatically migrates legacy data to new format.
 */
export const getApplications = (): JobApplication[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    
    const rawApps = JSON.parse(data);
    if (!Array.isArray(rawApps)) return [];
    
    // ⚡ Bolt: Centralized sanitization and migration in a single pass (Loop Fusion)
    // to avoid expensive runtime sanitization in components and minimize iterations.
    const migrated = rawApps.map((rawApp) => {
      // 1. Sanitize
      const app = typeof rawApp === 'object' && rawApp !== null
        ? sanitizeObject(rawApp as Record<string, unknown>)
        : rawApp;

      // ⚡ Bolt: Normalize status to Capitalized format (e.g., 'applied' -> 'Applied')
      // to ensure consistency and prevent duplicate filter options.
      if (app && typeof app === 'object' && 'status' in app && typeof app.status === 'string') {
        const s = app.status;
        if (s && /^[a-z]/.test(s)) {
          (app as any).status = s.charAt(0).toUpperCase() + s.slice(1);
        }
      }

      // 2. Migrate legacy applications if needed
      if (isLegacyApplication(app)) {
        const migratedApp = migrateApplicationData(app);
        // Save migrated data back
        setTimeout(() => {
          const currentApps = getApplications();
          const updatedApps = currentApps.map((a) => 
            a.id === migratedApp.id ? migratedApp : a
          );
          saveApplications(updatedApps);
        }, 0);
        return migratedApp;
      }
      return app as JobApplication;
    });
    
    return migrated;
  } catch (error) {
    console.error("Error loading data from localStorage:", error);
    return [];
  }
};

/**
 * Guarda el array de aplicaciones en localStorage.
 */
export const saveApplications = (applications: JobApplication[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
  } catch (error) {
    console.error("Error saving data to localStorage:", error);
  }
};

