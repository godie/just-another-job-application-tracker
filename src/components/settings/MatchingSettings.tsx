
import React from 'react';
import type { MatchingPreferences } from '../../types/matching';
import { getLocaleDateString } from '../../utils/dateHelpers';

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
            <div className="p-2 bg-primary/5 dark:bg-primary/10 text-primary rounded-lg">
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                AI-Powered Job Matching
              </h3>
              <p className="text-sm text-muted-foreground">
                Automatically score how well opportunities match your profile
              </p>
            </div>
          </div>
          <label htmlFor="matching-enabled" className="relative inline-flex items-center cursor-pointer">
                <input
                  id="matching-enabled"
                  type="checkbox"
                  role="switch"
                  aria-checked={preferences.enabled}
                  aria-label="AI-Powered Job Matching"
                  checked={preferences.enabled}
                  onChange={() => handleToggle('enabled')}
                  className="sr-only peer"
                />
            <div
              aria-hidden="true"
              className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ring rounded-full peer dark:bg-muted peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-border peer-checked:bg-primary"
            />
          </label>
        </div>
      </section>

      {preferences.enabled && (
        <>
          {/* Gemini Toggle */}
          <section className="border-t border-border pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-semibold text-foreground">
                  Use Gemini AI for Scoring
                </h4>
                <p className="text-sm text-muted-foreground">
                  Enable AI-enhanced semantic analysis (requires Gemini API key)
                </p>
              </div>
              <label htmlFor="matching-gemini" className="relative inline-flex items-center cursor-pointer">
                <input
                  id="matching-gemini"
                  type="checkbox"
                  role="switch"
                  aria-checked={preferences.useGemini}
                  aria-label="Use Gemini AI for Scoring"
                  checked={preferences.useGemini}
                  onChange={() => handleToggle('useGemini')}
                  className="sr-only peer"
                />
                <div
                  aria-hidden="true"
                  className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ring rounded-full peer dark:bg-muted peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-border peer-checked:bg-primary"
                />
              </label>
            </div>
          </section>

          {/* Data Source Toggles */}
          <section className="border-t border-border pt-6">
            <h4 className="text-base font-semibold text-foreground mb-4">
              Data Sources
            </h4>
            <div className="space-y-3">
              <label htmlFor="matching-timeline" className="flex items-center gap-3 cursor-pointer">
                <input
                  id="matching-timeline"
                  type="checkbox"
                  checked={preferences.includeTimeline}
                  onChange={() => handleToggle('includeTimeline')}
                  aria-label="Include Timeline Events"
                  className="size-4 text-primary border-input rounded focus:ring-ring"
                />
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Include Timeline Events</span>
                  <p className="text-xs text-muted-foreground">
                    Use interview history to infer successful patterns
                  </p>
                </div>
              </label>

              <label htmlFor="matching-notes" className="flex items-center gap-3 cursor-pointer">
                <input
                  id="matching-notes"
                  type="checkbox"
                  checked={preferences.includeNotes}
                  onChange={() => handleToggle('includeNotes')}
                  aria-label="Include Application Notes"
                  className="size-4 text-primary border-input rounded focus:ring-ring"
                />
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Include Application Notes</span>
                  <p className="text-xs text-muted-foreground">
                    Use notes text for skill and preference inference
                  </p>
                </div>
              </label>

              <label htmlFor="matching-cv" className="flex items-center gap-3 cursor-pointer">
                <input
                  id="matching-cv"
                  type="checkbox"
                  checked={preferences.includeCvText}
                  onChange={() => handleToggle('includeCvText')}
                  aria-label="Include CV/Resume Text"
                  className="size-4 text-primary border-input rounded focus:ring-ring"
                />
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Include CV/Resume Text</span>
                  <p className="text-xs text-muted-foreground">
                    Use pasted CV text for profile enrichment
                  </p>
                </div>
              </label>
            </div>
          </section>

          {/* Behavior Settings */}
          <section className="border-t border-border pt-6">
            <h4 className="text-base font-semibold text-foreground mb-4">
              Behavior
            </h4>

            <div className="space-y-4">
              <label htmlFor="matching-auto-compute" className="flex items-center gap-3 cursor-pointer">
                <input
                  id="matching-auto-compute"
                  type="checkbox"
                  checked={preferences.autoComputeOnOpportunityAdd}
                  onChange={() => handleToggle('autoComputeOnOpportunityAdd')}
                  aria-label="Auto-compute scores on new opportunity"
                  className="size-4 text-primary border-input rounded focus:ring-ring"
                />
                <div>
                  <span className="text-sm font-medium text-muted-foreground">
                    Auto-compute scores on new opportunity
                  </span>
                </div>
              </label>

              <label htmlFor="matching-prioritize-remote" className="flex items-center gap-3 cursor-pointer">
                <input
                  id="matching-prioritize-remote"
                  type="checkbox"
                  checked={preferences.prioritizeRemote}
                  onChange={() => handleToggle('prioritizeRemote')}
                  aria-label="Prioritize remote opportunities"
                  className="size-4 text-primary border-input rounded focus:ring-ring"
                />
                <div>
                  <span className="text-sm font-medium text-muted-foreground">
                    Prioritize remote opportunities
                  </span>
                </div>
              </label>

              {/* Threshold Slider */}
              <div className="pt-2">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Minimum Match Threshold
                  </span>
                  <span className="text-sm font-bold text-primary">
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
                  aria-label="Minimum Match Threshold"
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Any match</span>
                  <span>Strong matches only</span>
                </div>
              </div>
            </div>
          </section>

          {/* Actions */}
          <section className="border-t border-border pt-6">
            <h4 className="text-base font-semibold text-foreground mb-4">
              Profile & Scoring
            </h4>
            <div className="flex flex-wrap gap-3">
              <button
                type='button'
                onClick={onOpenProfileModal}
                className="px-4 py-2 text-sm font-medium bg-muted text-muted-foreground hover:bg-accent rounded-lg transition border border-border"
              >
                Edit Profile
              </button>
              <button
                type='button'
                onClick={onBuildProfile}
                disabled={profileStatus === 'building'}
                aria-busy={profileStatus === 'building'}
                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition flex items-center gap-2"
              >
                {profileStatus === 'building' ? (
                  <>
                    <svg className="animate-spin size-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Building…
                  </>
                ) : (
                  'Build Profile from History'
                )}
              </button>
              <button
                type='button'
                onClick={onComputeScores}
                disabled={isComputingScores || profileStatus === 'none'}
                aria-busy={isComputingScores}
                className="px-4 py-2 text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition flex items-center gap-2"
              >
                {isComputingScores ? (
                  <>
                    <svg className="animate-spin size-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Scoring…
                  </>
                ) : (
                  'Compute Scores'
                )}
              </button>
            </div>
            {profileLastComputed && (
              <p className="text-xs text-muted-foreground mt-3">
                Last profile update: {getLocaleDateString(profileLastComputed)}
              </p>
            )}
          </section>

          {/* Danger Zone */}
          <section className="border-t border-border pt-6">
            <button
              type='button'
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

