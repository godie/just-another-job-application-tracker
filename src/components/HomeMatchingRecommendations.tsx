import React, { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { JobApplication } from '../types/applications';
import type { JobMatchResult } from '../types/matching';
import type { JobOpportunity } from '../types/opportunities';
import { useMatchThreshold } from '../hooks/useMatchThreshold';
import { useOpportunitiesStore } from '../stores/opportunitiesStore';
import { useMatchingStore } from '../stores/matchingStore';
import { RecommendationPanel } from './RecommendationPanel';
import { Button } from './ui/Button';

interface HomeMatchingRecommendationsProps {
  applications: JobApplication[];
  onNavigate?: (page: 'opportunities' | 'settings') => void;
}

export const HomeMatchingRecommendations: React.FC<HomeMatchingRecommendationsProps> = ({
  applications,
  onNavigate,
}) => {
  const { t } = useTranslation();
  const opportunities = useOpportunitiesStore((state) => state.opportunities);
  const matchResults = useMatchingStore((state) => state.matchResults);
  const matchingPreferences = useMatchingStore((state) => state.preferences);
  const profile = useMatchingStore((state) => state.profile);
  const loadMatchingState = useMatchingStore((state) => state.loadMatchingState);
  const computeScores = useMatchingStore((state) => state.computeScores);
  const { matchThreshold, setMatchThreshold, resetThreshold, hasOverride } = useMatchThreshold();
  const computedIdsRef = useRef<string>('');

  useEffect(() => {
    loadMatchingState();
  }, [loadMatchingState]);

  useEffect(() => {
    if (!matchingPreferences.enabled || opportunities.length === 0) return;
    const ids = opportunities.map((opportunity) => opportunity.id).sort().join(',');
    if (ids === computedIdsRef.current) return;
    computedIdsRef.current = ids;
    computeScores(opportunities, applications).catch(console.error);
  }, [matchingPreferences.enabled, opportunities, applications, computeScores]);

  const recommendations = useMemo(() => {
    return Object.entries(matchResults)
      .map(([opportunityId, result]) => {
        const opportunity = opportunities.find((candidate) => candidate.id === opportunityId);
        return opportunity ? { opportunity, matchResult: result } : null;
      })
      .filter((recommendation): recommendation is {
        opportunity: JobOpportunity;
        matchResult: JobMatchResult;
      } => recommendation !== null)
      .sort((a, b) => b.matchResult.overallScore - a.matchResult.overallScore);
  }, [matchResults, opportunities]);

  const filteredRecommendations = useMemo(() => {
    if (matchThreshold === 0) return recommendations;
    return recommendations.filter((recommendation) => recommendation.matchResult.overallScore >= matchThreshold);
  }, [recommendations, matchThreshold]);

  return (
    <>
      {matchingPreferences.enabled && recommendations.length > 0 && (
        <div className="mb-8 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <label htmlFor="home-match-threshold" className="text-sm font-medium text-muted-foreground">
                {t('home.minMatchThreshold')}: <span className="text-foreground font-semibold">{matchThreshold}%</span>
              </label>
              <input
                id="home-match-threshold"
                type="range"
                min={0}
                max={100}
                step={5}
                value={matchThreshold}
                onChange={(event) => setMatchThreshold(parseInt(event.target.value, 10))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                aria-label={t('home.minMatchThreshold')}
              />
            </div>
            {hasOverride && (
              <button
                type="button"
                onClick={resetThreshold}
                className="text-xs font-medium text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors whitespace-nowrap"
              >
                {t('settings.resetDefault')}
              </button>
            )}
            {matchThreshold > 0 && (
              <p className="text-xs text-muted-foreground whitespace-nowrap">
                {t('home.showingAboveThreshold', { count: filteredRecommendations.length, threshold: matchThreshold })}
              </p>
            )}
          </div>
          {filteredRecommendations.length === 0 ? (
            <div className="bg-muted rounded-lg border border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">{t('home.noThresholdMatches')}</p>
            </div>
          ) : (
            <RecommendationPanel
              recommendations={filteredRecommendations}
              title={t('home.topMatches')}
              maxDisplay={5}
              onApply={() => onNavigate?.('opportunities')}
            />
          )}
        </div>
      )}

      {!matchingPreferences.enabled && !profile && opportunities.length > 0 && (
        <div className="mb-8 bg-card rounded-lg border border-border p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-base font-semibold text-foreground">{t('home.matching.title', 'AI Job Matching')}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t('home.matching.desc', 'Set up your profile to get personalized recommendations based on your skills and preferences.')}
              </p>
            </div>
            <Button type="button" variant="primary" size="sm" onClick={() => onNavigate?.('settings')}>
              {t('home.matching.setup', 'Set Up Matching')}
            </Button>
          </div>
        </div>
      )}
    </>
  );
};
