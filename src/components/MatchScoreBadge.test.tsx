// src/components/MatchScoreBadge.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MatchScoreBadge } from './MatchScoreBadge';
import type { JobMatchResult } from '../types/matching';

function makeResult(overrides: Partial<JobMatchResult> = {}): JobMatchResult {
  return {
    opportunityId: 'opp-1',
    overallScore: 75,
    confidence: 'high',
    subscores: {
      semanticFit: 70,
      historicalFit: 60,
      skillsFit: 80,
      locationWorkTypeFit: 85,
      compensationFit: 70,
      seniorityFit: 75,
    },
    strengths: ['Strong skills match'],
    gaps: [],
    verdict: 'good_fit',
    explanation: 'Good match based on skills and location.',
    profileVersion: 1,
    computedAt: new Date().toISOString(),
    computationMethod: 'deterministic',
    ...overrides,
  };
}

describe('MatchScoreBadge', () => {
  it('renders "No match" when result is null', () => {
    render(<MatchScoreBadge result={null} />);
    expect(screen.getByText('No match')).toBeInTheDocument();
  });

  it('renders score and verdict label', () => {
    render(<MatchScoreBadge result={makeResult()} />);
    expect(screen.getByText('75')).toBeInTheDocument();
    expect(screen.getByText('Good')).toBeInTheDocument();
  });

  it('renders correct label for excellent_fit', () => {
    render(<MatchScoreBadge result={makeResult({ verdict: 'excellent_fit', overallScore: 90 })} />);
    expect(screen.getByText('Excellent')).toBeInTheDocument();
    expect(screen.getByText('90')).toBeInTheDocument();
  });

  it('renders correct label for low_fit', () => {
    render(<MatchScoreBadge result={makeResult({ verdict: 'low_fit', overallScore: 25 })} />);
    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
  });

  it('hides label when showLabel is false', () => {
    render(<MatchScoreBadge result={makeResult()} showLabel={false} />);
    expect(screen.queryByText('Good')).not.toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleBadgeClick = vi.fn();
    render(<MatchScoreBadge result={makeResult()} onClick={handleBadgeClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(handleBadgeClick).toHaveBeenCalledTimes(1);
  });

  it('does not render as button when onClick is not provided', () => {
    render(<MatchScoreBadge result={makeResult()} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('applies size classes', () => {
    const { container: sm } = render(<MatchScoreBadge result={makeResult()} size="sm" />);
    const { container: lg } = render(<MatchScoreBadge result={makeResult()} size="lg" />);
    expect(sm).toBeTruthy();
    expect(lg).toBeTruthy();
  });
});
