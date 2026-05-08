// src/components/RecommendationPanel.tsx

import React, { useState } from 'react';
import type { JobOpportunity } from '../types/opportunities';
import type { JobMatchResult } from '../types/matching';
import { MatchScoreBadge } from './MatchScoreBadge';
import { MatchBreakdownModal } from './MatchBreakdownModal';

interface Recommendation {
  opportunity: JobOpportunity;
  matchResult: JobMatchResult;
}

interface RecommendationPanelProps {
  recommendations: Recommendation[];
  title?: string;
  maxDisplay?: number;
  showViewAll?: boolean;
  onViewAll?: () => void;
  onApply?: (opportunity: JobOpportunity) => void;
  className?: string;
}

export const RecommendationPanel: React.FC<RecommendationPanelProps> = ({
  recommendations,
  title = 'Top Matches for You',
  maxDisplay = 5,
  showViewAll = true,
  onViewAll,
  onApply,
  className = '',
}) => {
  const [selectedOpportunity, setSelectedOpportunity] = useState<Recommendation | null>(null);

  const displayList = recommendations.slice(0, maxDisplay);

  if (recommendations.length === 0) {
    return (
      <div className={`bg-earth-50 dark:bg-earth-800/50 rounded-lg border border-earth-200 dark:border-earth-700 p-6 ${className}`}>
        <h3 className="text-base font-semibold text-earth-700 dark:text-earth-300 mb-2">
          {title}
        </h3>
        <p className="text-sm text-earth-500 dark:text-earth-400">
          No matching opportunities yet. Add some opportunities to get personalized recommendations.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-earth-800 rounded-lg border border-earth-200 dark:border-earth-700 overflow-hidden ${className}`}>
      <div className="px-5 py-4 border-b border-earth-200 dark:border-earth-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-sage-100 dark:bg-sage-900/30 text-sage-600 dark:text-sage-400 rounded">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-earth-800 dark:text-earth-100">
            {title}
          </h3>
        </div>
        {showViewAll && onViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm text-sage-600 dark:text-sage-400 hover:text-sage-700 dark:hover:text-sage-300 font-medium transition"
          >
            View all
          </button>
        )}
      </div>

      <div className="divide-y divide-earth-200 dark:divide-earth-700">
        {displayList.map(({ opportunity, matchResult }) => (
          <div
            key={opportunity.id}
            className="px-5 py-4 hover:bg-earth-50 dark:hover:bg-earth-700/50 transition group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-semibold text-earth-900 dark:text-earth-100 truncate">
                    {opportunity.position}
                  </h4>
                  <span className="text-xs text-earth-500 dark:text-earth-400">
                    at {opportunity.company}
                  </span>
                </div>
                {(opportunity.location || opportunity.jobType) && (
                  <p className="text-xs text-earth-500 dark:text-earth-400 mt-0.5">
                    {opportunity.location}
                    {opportunity.location && opportunity.jobType && ' · '}
                    {opportunity.jobType}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <MatchScoreBadge
                  result={matchResult}
                  size="sm"
                  onClick={() => setSelectedOpportunity({ opportunity, matchResult })}
                />
                {onApply && (
                  <button
                    onClick={() => onApply(opportunity)}
                    className="text-xs font-medium text-sage-600 dark:text-sage-400 hover:text-sage-800 dark:hover:text-sage-300 opacity-0 group-hover:opacity-100 focus:opacity-100 transition"
                  >
                    Apply
                  </button>
                )}
              </div>
            </div>

            {/* Explanation preview */}
            {matchResult.explanation && (
              <p className="text-xs text-earth-500 dark:text-earth-400 mt-2 line-clamp-2">
                {matchResult.explanation}
              </p>
            )}

            {/* Strengths tags */}
            {matchResult.strengths.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {matchResult.strengths.slice(0, 2).map((strength, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-sage-50 dark:bg-sage-900/20 text-sage-700 dark:text-sage-300"
                  >
                    {strength}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <MatchBreakdownModal
        isOpen={!!selectedOpportunity}
        onClose={() => setSelectedOpportunity(null)}
        result={selectedOpportunity?.matchResult ?? null}
        opportunityTitle={selectedOpportunity?.opportunity.position}
        opportunityCompany={selectedOpportunity?.opportunity.company}
      />
    </div>
  );
};

