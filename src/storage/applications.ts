// src/storage/applications.ts
import { STORAGE_KEY } from '../utils/constants';
import { generateId } from '../utils/id';
import { sanitizeObject } from '../utils/url';
import type { JobApplication, LegacyJobApplication, InterviewEvent, InterviewStageType } from '../types/applications';

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
    
    const apps = JSON.parse(data);
    if (!Array.isArray(apps)) return [];
    
    // Migrate and sanitize applications
    const processed = apps.map((app) => {
      let finalApp: JobApplication;

      if (isLegacyApplication(app)) {
        finalApp = migrateApplicationData(app);
        // Save migrated data back
        setTimeout(() => {
          const currentApps = getApplications();
          const updatedApps = currentApps.map((a) => 
            a.id === finalApp.id ? finalApp : a
          );
          saveApplications(updatedApps);
        }, 0);
      } else {
        finalApp = app as JobApplication;
      }

      // ⚡ Bolt: Centralized sanitization on load.
      // By sanitizing the object once here, we ensure all data in the app state
      // is safe and we can avoid expensive DOMPurify calls during render.
      return sanitizeObject(finalApp);
    });
    
    return processed;
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

