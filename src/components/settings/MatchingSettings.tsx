// src/components/settings/MatchingSettings.tsx

import React from 'react';
import type { MatchingPreferences } from '../../types/matching';

interface MatchingSettingsProps {
  preferences: MatchingPreferences;
  profileStatus: 'none' | 'building' | 'ready';
  profileLastComputed: string | null;
  isComputingScores: boolean;
  onUpdatePreferences: (updates: Partial<MatchingPreferences>) => void;
  onBuildProfile: () => void;
  onComputeScores: () => void;
  onOpenProfileModal: () => void;
  onClearData: () => void;
}

export const MatchingSettings: React.FC<MatchingSettingsProps> = ({
  preferences,
  profileStatus,
  profileLastComputed,
  isComputingScores,
  onUpdatePreferences,
  onBuildProfile,
  onComputeScores,
  onOpenProfileModal,
  onClearData,
}) => {
  const handleToggle = (field: keyof MatchingPreferences) => {
    const current = preferences[field];
    if (typeof current === 'boolean') {
      onUpdatePreferences({ [field]: !current } as Partial<MatchingPreferences>);
    }
  };

  const handleSliderChange = (field: 'minMatchThreshold', value: number) => {
    onUpdatePreferences({ [field]: value });
  };

  return (
    <div className="space-y-8">
      {/* Master Toggle */}
      <section>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sage-100 dark:bg-sage-900/30 text-sage-600 dark:text-sage-400 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-earth-800 dark:text-earth-100">
                AI-Powered Job Matching
              </h3>
              <p className="text-sm text-earth-500 dark:text-earth-400">
                Automatically score how well opportunities match your profile
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.enabled}
              onChange={() => handleToggle('enabled')}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-earth-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sage-300 dark:peer-focus:ring-sage-800 rounded-full peer dark:bg-earth-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-earth-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-earth-600 peer-checked:bg-sage-600" />
          </label>
        </div>
      </section>

      {preferences.enabled && (
        <>
          {/* Gemini Toggle */}
          <section className="border-t border-earth-200 dark:border-earth-700 pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-semibold text-earth-800 dark:text-earth-100">
                  Use Gemini AI for Scoring
                </h4>
                <p className="text-sm text-earth-500 dark:text-earth-400">
                  Enable AI-enhanced semantic analysis (requires Gemini API key)
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.useGemini}
                  onChange={() => handleToggle('useGemini')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-earth-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sage-300 dark:peer-focus:ring-sage-800 rounded-full peer dark:bg-earth-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-earth-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-earth-600 peer-checked:bg-sage-600" />
              </label>
            </div>
          </section>

          {/* Data Source Toggles */}
          <section className="border-t border-earth-200 dark:border-earth-700 pt-6">
            <h4 className="text-base font-semibold text-earth-800 dark:text-earth-100 mb-4">
              Data Sources
            </h4>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.includeTimeline}
                  onChange={() => handleToggle('includeTimeline')}
                  className="h-4 w-4 text-sage-600 border-earth-300 dark:border-earth-600 rounded focus:ring-sage-500"
                />
                <div>
                  <span className="text-sm font-medium text-earth-700 dark:text-earth-300">Include Timeline Events</span>
                  <p className="text-xs text-earth-500 dark:text-earth-400">
                    Use interview history to infer successful patterns
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.includeNotes}
                  onChange={() => handleToggle('includeNotes')}
                  className="h-4 w-4 text-sage-600 border-earth-300 dark:border-earth-600 rounded focus:ring-sage-500"
                />
                <div>
                  <span className="text-sm font-medium text-earth-700 dark:text-earth-300">Include Application Notes</span>
                  <p className="text-xs text-earth-500 dark:text-earth-400">
                    Use notes text for skill and preference inference
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.includeCvText}
                  onChange={() => handleToggle('includeCvText')}
                  className="h-4 w-4 text-sage-600 border-earth-300 dark:border-earth-600 rounded focus:ring-sage-500"
                />
                <div>
                  <span className="text-sm font-medium text-earth-700 dark:text-earth-300">Include CV/Resume Text</span>
                  <p className="text-xs text-earth-500 dark:text-earth-400">
                    Use pasted CV text for profile enrichment
                  </p>
                </div>
              </label>
            </div>
          </section>

          {/* Behavior Settings */}
          <section className="border-t border-earth-200 dark:border-earth-700 pt-6">
            <h4 className="text-base font-semibold text-earth-800 dark:text-earth-100 mb-4">
              Behavior
            </h4>

            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.autoComputeOnOpportunityAdd}
                  onChange={() => handleToggle('autoComputeOnOpportunityAdd')}
                  className="h-4 w-4 text-sage-600 border-earth-300 dark:border-earth-600 rounded focus:ring-sage-500"
                />
                <div>
                  <span className="text-sm font-medium text-earth-700 dark:text-earth-300">
                    Auto-compute scores on new opportunity
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.prioritizeRemote}
                  onChange={() => handleToggle('prioritizeRemote')}
                  className="h-4 w-4 text-sage-600 border-earth-300 dark:border-earth-600 rounded focus:ring-sage-500"
                />
                <div>
                  <span className="text-sm font-medium text-earth-700 dark:text-earth-300">
                    Prioritize remote opportunities
                  </span>
                </div>
              </label>

              {/* Threshold Slider */}
              <div className="pt-2">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-earth-700 dark:text-earth-300">
                    Minimum Match Threshold
                  </span>
                  <span className="text-sm font-bold text-sage-600 dark:text-sage-400">
                    {preferences.minMatchThreshold}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={preferences.minMatchThreshold}
                  onChange={(e) => handleSliderChange('minMatchThreshold', parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-earth-200 dark:bg-earth-700 rounded-lg appearance-none cursor-pointer accent-sage-600"
                />
                <div className="flex justify-between text-xs text-earth-500 dark:text-earth-400 mt-1">
                  <span>Any match</span>
                  <span>Strong matches only</span>
                </div>
              </div>
            </div>
          </section>

          {/* Actions */}
          <section className="border-t border-earth-200 dark:border-earth-700 pt-6">
            <h4 className="text-base font-semibold text-earth-800 dark:text-earth-100 mb-4">
              Profile & Scoring
            </h4>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={onOpenProfileModal}
                className="px-4 py-2 text-sm font-medium bg-earth-100 dark:bg-earth-700 text-earth-700 dark:text-earth-300 hover:bg-earth-200 dark:hover:bg-earth-600 rounded-lg transition border border-earth-200 dark:border-earth-600"
              >
                Edit Profile
              </button>
              <button
                onClick={onBuildProfile}
                disabled={profileStatus === 'building'}
                className="px-4 py-2 text-sm font-medium bg-sage-600 text-white hover:bg-sage-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition flex items-center gap-2"
              >
                {profileStatus === 'building' ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Building...
                  </>
                ) : (
                  'Build Profile from History'
                )}
              </button>
              <button
                onClick={onComputeScores}
                disabled={isComputingScores || profileStatus === 'none'}
                className="px-4 py-2 text-sm font-medium bg-earth-800 dark:bg-earth-600 text-white hover:bg-earth-900 dark:hover:bg-earth-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition flex items-center gap-2"
              >
                {isComputingScores ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Scoring...
                  </>
                ) : (
                  'Compute Scores'
                )}
              </button>
            </div>
            {profileLastComputed && (
              <p className="text-xs text-earth-500 dark:text-earth-400 mt-3">
                Last profile update: {new Date(profileLastComputed).toLocaleDateString()}
              </p>
            )}
          </section>

          {/* Danger Zone */}
          <section className="border-t border-earth-200 dark:border-earth-700 pt-6">
            <button
              onClick={onClearData}
              className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition border border-red-200 dark:border-red-800"
            >
              Clear All Matching Data
            </button>
          </section>
        </>
      )}
    </div>
  );
};

