
import React, { useMemo } from 'react';
import type { JobMatchResult, MatchVerdict } from '../types/matching';

interface MatchScoreBadgeProps {
  result: JobMatchResult | null;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  onClick?: () => void;
  className?: string;
}

function getScoreColor(_score: number, verdict: MatchVerdict): string {
  if (verdict === 'excellent_fit') return 'bg-primary text-primary-foreground';
  if (verdict === 'good_fit') return 'bg-primary/70 text-foreground';
  if (verdict === 'partial_fit') return 'bg-muted text-foreground';
  return 'bg-muted/70 text-muted-foreground';
}

function getScoreBorder(_score: number, verdict: MatchVerdict): string {
  if (verdict === 'excellent_fit') return 'border-primary/80';
  if (verdict === 'good_fit') return 'border-primary/60';
  if (verdict === 'partial_fit') return 'border-border';
  return 'border-border/70';
}

function getVerdictLabel(verdict: MatchVerdict): string {
  const labels: Record<MatchVerdict, string> = {
    excellent_fit: 'Excellent',
    good_fit: 'Good',
    partial_fit: 'Partial',
    low_fit: 'Low',
  };
  return labels[verdict];
}

const sizeClasses = {
  sm: 'text-xs px-1.5 py-0.5 gap-1',
  md: 'text-sm px-2.5 py-1 gap-1.5',
  lg: 'text-base px-3 py-1.5 gap-2',
};

const ringClasses = {
  sm: 'size-5 text-[10px]',
  md: 'size-7 text-xs',
  lg: 'size-9 text-sm',
};

export const MatchScoreBadge: React.FC<MatchScoreBadgeProps> = ({
  result,
  size = 'md',
  showLabel = true,
  onClick,
  className = '',
}) => {
  const styles = useMemo(() => {
    if (!result) {
      return {
        bg: 'bg-muted',
        text: 'text-muted-foreground',
        border: 'border-border',
        ring: 'border-border',
      };
    }
    return {
      bg: getScoreColor(result.overallScore, result.verdict),
      text: '',
      border: getScoreBorder(result.overallScore, result.verdict),
      ring: getScoreBorder(result.overallScore, result.verdict),
    };
  }, [result]);

  if (!result) {
    return (
      <span
        className={`inline-flex items-center rounded border ${styles.bg} ${styles.text} ${sizeClasses[size]} ${className}`}
        title="No match data"
      >
        <span className={`inline-flex items-center justify-center rounded-full border-2 ${styles.ring} ${ringClasses[size]}`}>
          ?
        </span>
        {showLabel && <span>No match</span>}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded border ${styles.bg} ${styles.border} ${sizeClasses[size]} ${
        onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : 'cursor-default'
      } ${className}`}
      title={`${result.overallScore}% match — ${result.explanation}`}
    >
      <span
        className={`inline-flex items-center justify-center rounded-full border-2 font-bold ${styles.ring} ${ringClasses[size]} ${
          result.verdict === 'excellent_fit' || result.verdict === 'good_fit'
            ? 'border-white/50'
            : ''
        }`}
      >
        {result.overallScore}
      </span>
      {showLabel && (
        <span className="font-semibold">{getVerdictLabel(result.verdict)}</span>
      )}
    </button>
  );
};
