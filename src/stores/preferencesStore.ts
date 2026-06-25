import { create } from 'zustand';
import type { UserPreferences } from '../types/preferences';
import { DEFAULT_PREFERENCES } from '../utils/constants';
import { getPreferences, savePreferences } from '../storage/preferences';

interface PreferencesState {
  preferences: UserPreferences;
  isLoading: boolean;
  
  loadPreferences: () => void;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  setPreferences: (preferences: UserPreferences) => void;
  resetPreferences: () => void;
}

export const usePreferencesStore = create<PreferencesState>()((set) => ({
  preferences: DEFAULT_PREFERENCES,
  isLoading: false,

  loadPreferences: () => {
    set({ isLoading: true });
    try {
      const prefs = getPreferences();
      set({ preferences: prefs, isLoading: false });
    } catch (error) {
      console.error('Error loading preferences:', error);
      set({ preferences: DEFAULT_PREFERENCES, isLoading: false });
    }
  },

  updatePreferences: (updates) => {
    set((state) => {
      const updated = { ...state.preferences, ...updates };
      savePreferences(updated);
      return { preferences: updated };
    });
  },

  setPreferences: (preferences) => {
    set({ preferences });
    savePreferences(preferences);
  },

  resetPreferences: () => {
    set({ preferences: DEFAULT_PREFERENCES });
    savePreferences(DEFAULT_PREFERENCES);
  },
}));
