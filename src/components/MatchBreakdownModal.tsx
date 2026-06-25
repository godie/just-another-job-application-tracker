
import React, { useRef, useEffect } from 'react';
import type { JobMatchResult } from '../types/matching';
import useFocusTrap from '../hooks/useFocusTrap';
import useKeyboardEscape from '../hooks/useKeyboardEscape';
import { getLocaleDateString } from '../utils/dateHelpers';
import { Button } from './ui/Button';

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
  excellent_fit: { color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/30' },
  good_fit: { color: 'text-primary/80', bg: 'bg-primary/5', border: 'border-primary/20' },
  partial_fit: { color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border' },
  low_fit: { color: 'text-muted-foreground/70', bg: 'bg-muted/50', border: 'border-border/70' },
};

function ScoreBar({ label, score, max = 100 }: { label: string; score: number; max?: number }) {
  const percentage = Math.round((score / max) * 100);
  let barColor = 'bg-muted-foreground/40';
  if (percentage >= 80) barColor = 'bg-primary';
  else if (percentage >= 50) barColor = 'bg-primary/60';

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-foreground">{score}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
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
  useKeyboardEscape(onClose, isOpen);

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
      role="none"
      className="fixed inset-0 z-50 p-4 bg-black/50 backdrop-blur-sm flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <dialog
        open
        aria-modal="true"
        aria-labelledby="match-breakdown-title"
        className="m-0 w-full max-w-lg bg-card rounded-xl shadow-2xl border border-border overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        <div
          ref={modalRef}
        >
        {/* Header */}
        <div className={`p-6 border-b ${config.border}`}>
          <div className="flex items-start justify-between">
            <div>
              <h2
            id="match-breakdown-title"
            className="text-xl font-semibold text-foreground"
          >
                Match Analysis
              </h2>
              {opportunityTitle && (
                <p className="text-sm text-muted-foreground mt-1">
                  {opportunityTitle}
                  {opportunityCompany && ` at ${opportunityCompany}`}
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>

          {/* Overall Score */}
          <div className={`mt-4 flex items-center gap-4 p-4 rounded-lg border ${config.bg} ${config.border}`}>
            <div className={`text-4xl font-bold ${config.color}`}>{result.overallScore}%</div>
            <div className="flex-1">
              <p className={`font-semibold capitalize ${config.color}`}>
                {result.verdict.replace(/_/g, ' ')}
              </p>
              <p className="text-sm text-muted-foreground">{result.explanation}</p>
            </div>
            <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground capitalize">
              {result.confidence} confidence
            </span>
          </div>
        </div>

        {/* Subscores */}
        <div className="p-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Score Breakdown
          </h3>
          {(Object.entries(subscoreLabels) as [keyof typeof subscoreLabels, string][]).map(
            ([key, label]) => (
              <ScoreBar
                key={`score-${key}`}
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
              <h3 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Strengths
              </h3>
              <ul className="space-y-1">                {result.strengths.map((s) => (
                  <li
                    key={`strength-${s}`}
                    className="text-sm text-foreground pl-6 relative before:content-['•'] before:absolute before:left-2 before:text-primary"
                  >
                    {s}
                  </li>
                ))}</ul>
            </div>
          )}

          {result.gaps.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Potential Gaps
              </h3>
              <ul className="space-y-1">
                {result.gaps.map((g) => (
                  <li
                    key={`gap-${g}`}
                    className="text-sm text-muted-foreground pl-6 relative before:content-['•'] before:absolute before:left-2 before:text-muted-foreground/50"
                  >
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-muted border-t border-border flex justify-between items-center">
          <span className="text-xs text-muted-foreground">
            Computed {getLocaleDateString(result.computedAt)} · {result.computationMethod}
          </span>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
      </dialog>
    </div>
  );
};
