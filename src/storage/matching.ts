
import type {
  UserMatchProfile,
  JobMatchResult,
  MatchingPreferences,
  UserFeedbackOnMatch,
} from '../types/matching';

const MATCH_PROFILE_KEY = 'jat_match_profile_v1';
const MATCH_RESULTS_KEY = 'jat_match_results_v1';
const MATCHING_PREFS_KEY = 'jat_matching_prefs_v1';
const MATCH_FEEDBACK_KEY = 'jat_match_feedback_v1';
const MATCH_THRESHOLD_OVERRIDE_KEY = 'jat_match_threshold_override_v1';

export const DEFAULT_MATCHING_PREFERENCES: MatchingPreferences = {
  enabled: false,
  useGemini: true,
  includeCvText: true,
  includeNotes: false,
  includeTimeline: true,
  minMatchThreshold: 40,
  prioritizeRemote: false,
  autoComputeOnOpportunityAdd: true,
};


export function getMatchProfile(): UserMatchProfile | null {
  try {
    const data = localStorage.getItem(MATCH_PROFILE_KEY);
    return data ? (JSON.parse(data) as UserMatchProfile) : null;
  } catch (error) {
    console.error('Error retrieving match profile from storage', error);
    return null;
  }
}

export function saveMatchProfile(profile: UserMatchProfile): void {
  try {
    localStorage.setItem(MATCH_PROFILE_KEY, JSON.stringify({ ...profile }));
  } catch (error) {
    console.error('Error saving match profile to storage', error);
  }
}

export function clearMatchProfile(): void {
  try {
    localStorage.removeItem(MATCH_PROFILE_KEY);
  } catch (error) {
    console.error('Error clearing match profile from storage', error);
  }
}


export function getMatchResults(): Record<string, JobMatchResult> {
  try {
    const data = localStorage.getItem(MATCH_RESULTS_KEY);
    return data ? (JSON.parse(data) as Record<string, JobMatchResult>) : {};
  } catch (error) {
    console.error('Error retrieving match results from storage', error);
    return {};
  }
}

export function saveMatchResults(results: Record<string, JobMatchResult>): void {
  try {
    localStorage.setItem(MATCH_RESULTS_KEY, JSON.stringify({ ...results }));
  } catch (error) {
    console.error('Error saving match results to storage', error);
  }
}

export function clearMatchResults(): void {
  try {
    localStorage.removeItem(MATCH_RESULTS_KEY);
  } catch (error) {
    console.error('Error clearing match results from storage', error);
  }
}


export function getMatchingPreferences(): MatchingPreferences {
  try {
    const data = localStorage.getItem(MATCHING_PREFS_KEY);
    if (!data) return { ...DEFAULT_MATCHING_PREFERENCES };
    const parsed = JSON.parse(data) as Partial<MatchingPreferences>;
    return { ...DEFAULT_MATCHING_PREFERENCES, ...parsed };
  } catch (error) {
    console.error('Error retrieving matching preferences from storage', error);
    return { ...DEFAULT_MATCHING_PREFERENCES };
  }
}

export function saveMatchingPreferences(prefs: MatchingPreferences): void {
  try {
    localStorage.setItem(MATCHING_PREFS_KEY, JSON.stringify({ ...prefs }));
  } catch (error) {
    console.error('Error saving matching preferences to storage', error);
  }
}


export function getMatchFeedback(): UserFeedbackOnMatch[] {
  try {
    const data = localStorage.getItem(MATCH_FEEDBACK_KEY);
    return data ? (JSON.parse(data) as UserFeedbackOnMatch[]) : [];
  } catch (error) {
    console.error('Error retrieving match feedback from storage', error);
    return [];
  }
}

export function addMatchFeedback(feedback: UserFeedbackOnMatch): void {
  try {
    const current = getMatchFeedback();
    const updated = [...current, { ...feedback }];
    localStorage.setItem(MATCH_FEEDBACK_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error adding match feedback to storage', error);
  }
}

export function getMatchThresholdOverride(): number | null {
  try {
    const data = localStorage.getItem(MATCH_THRESHOLD_OVERRIDE_KEY);
    if (!data) return null;
    const parsed = parseInt(data, 10);
    return Number.isNaN(parsed) ? null : parsed;
  } catch (error) {
    console.error('Error retrieving match threshold override from storage', error);
    return null;
  }
}

export function saveMatchThresholdOverride(threshold: number): void {
  try {
    localStorage.setItem(MATCH_THRESHOLD_OVERRIDE_KEY, String(threshold));
  } catch (error) {
    console.error('Error saving match threshold override to storage', error);
  }
}

export function clearMatchThresholdOverride(): void {
  try {
    localStorage.removeItem(MATCH_THRESHOLD_OVERRIDE_KEY);
  } catch (error) {
    console.error('Error clearing match threshold override from storage', error);
  }
}


