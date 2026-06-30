
import { create } from 'zustand';
import type { JobApplication } from '../types/applications';
import type { JobOpportunity } from '../types/opportunities';
import type {
  UserMatchProfile,
  JobMatchResult,
  MatchingPreferences,
  UserFeedbackOnMatch,
} from '../types/matching';
import { hasKeyStored } from '../hooks/useCrypto';
import { useGeminiKeyStore } from '../store/geminiKeyStore';

import {
  getMatchProfile,
  saveMatchProfile,
  getMatchResults,
  saveMatchResults,
  getMatchingPreferences,
  saveMatchingPreferences,
  DEFAULT_MATCHING_PREFERENCES,
  addMatchFeedback,
  clearMatchProfile,
  clearMatchResults,
} from '../storage/matching';

import { buildProfileFromHistory } from '../utils/matching';
import { buildHybridProfile } from '../utils/geminiProfile';
import { batchCalculateHybridScores } from '../utils/geminiJobScoring';

interface MatchingState {
  // Data
  profile: UserMatchProfile | null;
  matchResults: Record<string, JobMatchResult>;
  preferences: MatchingPreferences;

  isComputingProfile: boolean;
  isComputingScores: boolean;
  computeError: string | null;
  lastProfileCompute: string | null;
  lastScoresCompute: string | null;

  loadMatchingState: () => void;
  loadPreferences: () => void;
  updatePreferences: (updates: Partial<MatchingPreferences>) => void;

  buildProfile: (applications: JobApplication[], options?: { cvText?: string }) => Promise<void>;
  computeScores: (opportunities: JobOpportunity[], applications: JobApplication[]) => Promise<void>;
  getMatchResult: (opportunityId: string) => JobMatchResult | null;
  getTopMatches: (limit?: number) => Array<{ opportunityId: string; result: JobMatchResult }>;
  getMatchesAboveThreshold: (threshold?: number) => Array<{ opportunityId: string; result: JobMatchResult }>;

  recordFeedback: (feedback: Omit<UserFeedbackOnMatch, 'timestamp'>) => void;
  clearAllMatchingData: () => void;
  resetError: () => void;
}

async function getGeminiApiKey(): Promise<string | null> {
  if (!hasKeyStored()) return null;

  const memoryKey = useGeminiKeyStore.getState().geminiKeyInMemory;
  if (memoryKey) return memoryKey;

  return null;
}

export const useMatchingStore = create<MatchingState>()((set, get) => ({
  profile: null,
  matchResults: {},
  preferences: { ...DEFAULT_MATCHING_PREFERENCES },
  isComputingProfile: false,
  isComputingScores: false,
  computeError: null,
  lastProfileCompute: null,
  lastScoresCompute: null,

  loadMatchingState: () => {
    const profile = getMatchProfile();
    const results = getMatchResults();
    const prefs = getMatchingPreferences();
    set({
      profile,
      matchResults: results,
      preferences: prefs,
      lastProfileCompute: profile?.lastComputed ?? null,
      lastScoresCompute: Object.values(results)[0]?.computedAt ?? null,
    });
  },

  loadPreferences: () => {
    const prefs = getMatchingPreferences();
    set({ preferences: prefs });
  },

  updatePreferences: (updates) => {
    set((state) => {
      const updated = { ...state.preferences, ...updates };
      saveMatchingPreferences(updated);
      return { preferences: updated };
    });
  },

  buildProfile: async (applications, options) => {
    const { preferences } = get();
    if (!preferences.enabled) return;

    set({ isComputingProfile: true, computeError: null });

    try {
      const deterministicProfile = buildProfileFromHistory(applications, {
        cvText: options?.cvText,
        explicitRoles: undefined,
        explicitSkills: undefined,
      });

      let finalProfile: UserMatchProfile;

      if (preferences.useGemini) {
        const apiKey = await getGeminiApiKey();
        if (apiKey) {
          finalProfile = await buildHybridProfile(apiKey, applications, {
            cvText: options?.cvText,
            includeNotes: preferences.includeNotes,
            includeTimeline: preferences.includeTimeline,
            deterministicProfile,
          });
        } else {
          finalProfile = deterministicProfile;
        }
      } else {
        finalProfile = deterministicProfile;
      }

      saveMatchProfile(finalProfile);
      set({
        profile: finalProfile,
        isComputingProfile: false,
        lastProfileCompute: finalProfile.lastComputed,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error building profile';
      set({ isComputingProfile: false, computeError: message });
    }
  },

  computeScores: async (opportunities, applications) => {
    const { preferences, profile } = get();
    if (!preferences.enabled) return;
    if (opportunities.length === 0) return;

    let currentProfile = profile;
    if (!currentProfile) {
      await get().buildProfile(applications);
      currentProfile = get().profile;
    }
    if (!currentProfile) {
      set({ computeError: 'Unable to build profile from application history' });
      return;
    }

    set({ isComputingScores: true, computeError: null });

    try {
      let apiKey: string | null = null;
      if (preferences.useGemini) {
        apiKey = await getGeminiApiKey();
      }

      const results = await batchCalculateHybridScores(apiKey, opportunities, currentProfile);

      saveMatchResults(results);
      set({
        matchResults: results,
        isComputingScores: false,
        lastScoresCompute: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error computing scores';
      set({ isComputingScores: false, computeError: message });
    }
  },

  getMatchResult: (opportunityId) => {
    return get().matchResults[opportunityId] ?? null;
  },

  getTopMatches: (limit = 5) => {
    const results = get().matchResults;
    return Object.entries(results)
      .map(([opportunityId, result]) => ({ opportunityId, result }))
      .sort((a, b) => b.result.overallScore - a.result.overallScore)
      .slice(0, limit);
  },

  getMatchesAboveThreshold: (threshold) => {
    const { preferences, matchResults } = get();
    const minScore = threshold ?? preferences.minMatchThreshold;
    return Object.entries(matchResults)
      .reduce<Array<{ opportunityId: string; result: JobMatchResult }>>((acc, [opportunityId, result]) => {
        if (result.overallScore >= minScore) {
          acc.push({ opportunityId, result });
        }
        return acc;
      }, [])
      .sort((a, b) => b.result.overallScore - a.result.overallScore);
  },

  recordFeedback: (feedback) => {
    const fullFeedback: UserFeedbackOnMatch = {
      ...feedback,
      timestamp: new Date().toISOString(),
    };
    addMatchFeedback(fullFeedback);
  },

  clearAllMatchingData: () => {
    clearMatchProfile();
    clearMatchResults();
    saveMatchingPreferences({ ...DEFAULT_MATCHING_PREFERENCES });
    set({
      profile: null,
      matchResults: {},
      preferences: { ...DEFAULT_MATCHING_PREFERENCES },
      computeError: null,
      lastProfileCompute: null,
      lastScoresCompute: null,
    });
  },

  resetError: () => set({ computeError: null }),
}));
