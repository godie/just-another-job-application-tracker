// src/components/MatchBreakdownModal.tsx

import React, { useRef, useEffect } from 'react';
import type { JobMatchResult } from '../types/matching';
import useFocusTrap from '../hooks/useFocusTrap';

interface MatchBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: JobMatchResult | null;
  opportunityTitle?: string;
  opportunityCompany?: string;
}

const subscoreLabels: Record<keyof JobMatchResult['subscores'], string> = {
  semanticFit: 'Role Fit',
  historicalFit: 'History Match',
  skillsFit: 'Skills Match',
  locationWorkTypeFit: 'Location & Work Type',
  compensationFit: 'Compensation',
  seniorityFit: 'Seniority',
};

const verdictConfig = {
  excellent_fit: { color: 'text-sage-700 dark:text-sage-300', bg: 'bg-sage-50 dark:bg-sage-900/20', border: 'border-sage-200 dark:border-sage-700' },
  good_fit: { color: 'text-sage-600 dark:text-sage-400', bg: 'bg-sage-50/50 dark:bg-sage-900/10', border: 'border-sage-200 dark:border-sage-700' },
  partial_fit: { color: 'text-earth-600 dark:text-earth-400', bg: 'bg-earth-50 dark:bg-earth-800/50', border: 'border-earth-200 dark:border-earth-700' },
  low_fit: { color: 'text-earth-500 dark:text-earth-500', bg: 'bg-earth-50 dark:bg-earth-800/30', border: 'border-earth-200 dark:border-earth-700' },
};

function ScoreBar({ label, score, max = 100 }: { label: string; score: number; max?: number }) {
  const percentage = Math.round((score / max) * 100);
  let barColor = 'bg-earth-400 dark:bg-earth-600';
  if (percentage >= 80) barColor = 'bg-sage-500 dark:bg-sage-400';
  else if (percentage >= 50) barColor = 'bg-earth-500 dark:bg-earth-400';

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-earth-600 dark:text-earth-400">{label}</span>
        <span className="font-semibold text-earth-800 dark:text-earth-200">{score}%</span>
      </div>
      <div className="h-2 bg-earth-200 dark:bg-earth-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export const MatchBreakdownModal: React.FC<MatchBreakdownModalProps> = ({
  isOpen,
  onClose,
  result,
  opportunityTitle,
  opportunityCompany,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, isOpen);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !result) return null;

  const config = verdictConfig[result.verdict];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="match-breakdown-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-lg bg-white dark:bg-earth-800 rounded-xl shadow-2xl border border-earth-200 dark:border-earth-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className={`p-6 border-b ${config.border}`}>
          <div className="flex items-start justify-between">
            <div>
              <h2
                id="match-breakdown-title"
                className="text-xl font-bold text-earth-900 dark:text-earth-100"
              >
                Match Analysis
              </h2>
              {opportunityTitle && (
                <p className="text-sm text-earth-500 dark:text-earth-400 mt-1">
                  {opportunityTitle}
                  {opportunityCompany && ` at ${opportunityCompany}`}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-earth-400 hover:text-earth-600 dark:hover:text-earth-300 hover:bg-earth-100 dark:hover:bg-earth-700 transition"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Overall Score */}
          <div className={`mt-4 flex items-center gap-4 p-4 rounded-lg border ${config.bg} ${config.border}`}>
            <div className={`text-4xl font-bold ${config.color}`}>{result.overallScore}%</div>
            <div className="flex-1">
              <p className={`font-semibold capitalize ${config.color}`}>
                {result.verdict.replace(/_/g, ' ')}
              </p>
              <p className="text-sm text-earth-500 dark:text-earth-400">{result.explanation}</p>
            </div>
            <span className="text-xs px-2 py-1 rounded bg-earth-100 dark:bg-earth-700 text-earth-600 dark:text-earth-400 capitalize">
              {result.confidence} confidence
            </span>
          </div>
        </div>

        {/* Subscores */}
        <div className="p-6 space-y-4">
          <h3 className="text-sm font-semibold text-earth-700 dark:text-earth-300 uppercase tracking-wider">
            Score Breakdown
          </h3>
          {(Object.entries(subscoreLabels) as [keyof typeof subscoreLabels, string][]).map(
            ([key, label]) => (
              <ScoreBar
                key={key}
                label={label}
                score={result.subscores[key]}
              />
            )
          )}
        </div>

        {/* Strengths & Gaps */}
        <div className="px-6 pb-6 space-y-4">
          {result.strengths.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-sage-700 dark:text-sage-400 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Strengths
              </h3>
              <ul className="space-y-1">
                {result.strengths.map((s, i) => (
                  <li
                    key={i}
                    className="text-sm text-earth-700 dark:text-earth-300 pl-6 relative before:content-['•'] before:absolute before:left-2 before:text-sage-500"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.gaps.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-earth-600 dark:text-earth-400 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Potential Gaps
              </h3>
              <ul className="space-y-1">
                {result.gaps.map((g, i) => (
                  <li
                    key={i}
                    className="text-sm text-earth-600 dark:text-earth-400 pl-6 relative before:content-['•'] before:absolute before:left-2 before:text-earth-400"
                  >
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-earth-50 dark:bg-earth-800/50 border-t border-earth-200 dark:border-earth-700 flex justify-between items-center">
          <span className="text-xs text-earth-500 dark:text-earth-400">
            Computed {new Date(result.computedAt).toLocaleDateString()} · {result.computationMethod}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium bg-sage-600 text-white hover:bg-sage-700 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

