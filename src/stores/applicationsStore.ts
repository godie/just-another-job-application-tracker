// src/stores/applicationsStore.ts
import { create } from 'zustand';
import type { JobApplication } from '../types/applications';
import { generateId } from '../utils/id';
import { getApplications, saveApplications } from '../storage/applications';
import { STORAGE_KEY } from '../utils/constants';

interface ApplicationsState {
  applications: JobApplication[];
  isLoading: boolean;
  
  // Actions
  loadApplications: () => void;
  addApplication: (application: Omit<JobApplication, 'id'>) => void;
  updateApplication: (id: string, updates: Partial<JobApplication>) => void;
  deleteApplication: (id: string) => void;
  setApplications: (applications: JobApplication[]) => void;
  refreshApplications: () => void;
}

/**
 * Zustand store for managing job applications.
 * Persistence is handled by the storage layer (src/storage/applications.ts)
 */
export const useApplicationsStore = create<ApplicationsState>()((set) => ({
  applications: [],
  isLoading: false,

  loadApplications: () => {
    set({ isLoading: true });
    try {
      // ⚡ Bolt: getApplications() already performs migration in-memory.
      // We just need to check if any migration occurred to persist it once.
      const apps = getApplications();
      
      // ⚡ Bolt: Check if migration is needed by looking for legacy format in storage.
      // This is a one-time operation during loadApplications.
      const rawData = localStorage.getItem(STORAGE_KEY);
      const needsMigration = rawData && !rawData.includes('"timeline":');

      if (needsMigration) {
        saveApplications(apps);
      }
      
      set({ applications: apps, isLoading: false });
    } catch (error) {
      console.error('Error loading applications:', error);
      set({ applications: [], isLoading: false });
    }
  },

  addApplication: (applicationData) => {
    const newApplication: JobApplication = {
      ...applicationData,
      id: generateId(),
      timeline: applicationData.timeline || [],
    } as JobApplication;

    set((state) => {
      const updated = [...state.applications, newApplication];
      saveApplications(updated);
      return { applications: updated };
    });
  },

  updateApplication: (id, updates) => {
    set((state) => {
      const updated = state.applications.map((app) =>
        app.id === id ? { ...app, ...updates } : app
      );
      saveApplications(updated);
      return { applications: updated };
    });
  },

  deleteApplication: (id) => {
    set((state) => {
      // Mark as deleted instead of removing
      const updated = state.applications.map((app) =>
        app.id === id ? { ...app, status: 'Deleted' } : app
      );
      saveApplications(updated);
      return { applications: updated };
    });
  },

  setApplications: (applications) => {
    set({ applications });
    saveApplications(applications);
  },

  refreshApplications: () => {
    const apps = getApplications();
    set({ applications: apps });
  },
}));
