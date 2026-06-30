import { create } from 'zustand';
import type { MergeData } from '../utils/mergeData';

interface MergeState {
  isConflictDetected: boolean;
  isSyncPaused: boolean;
  localData: MergeData | null;
  cloudData: MergeData | null;

  setConflict: (localData: MergeData, cloudData: MergeData) => void;
  clearConflict: () => void;
  pauseSync: () => void;
  resumeSync: () => void;
}

export const useMergeStore = create<MergeState>()((set) => ({
  isConflictDetected: false,
  isSyncPaused: false,
  localData: null,
  cloudData: null,

  setConflict: (localData, cloudData) => {
    set({
      isConflictDetected: true,
      isSyncPaused: true,
      localData,
      cloudData,
    });
  },

  clearConflict: () => {
    set({
      isConflictDetected: false,
      isSyncPaused: false,
      localData: null,
      cloudData: null,
    });
  },

  pauseSync: () => {
    set({ isSyncPaused: true });
  },

  resumeSync: () => {
    set({ isSyncPaused: false, isConflictDetected: false });
  },
}));
