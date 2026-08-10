import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MatchBreakdownModal } from './MatchBreakdownModal';
import type { JobMatchResult } from '../types/matching';

const result: JobMatchResult = {
  opportunityId: 'opp-1',
  overallScore: 82,
  confidence: 'high',
  subscores: {
    semanticFit: 80,
    historicalFit: 70,
    skillsFit: 85,
    locationWorkTypeFit: 90,
    compensationFit: 75,
    seniorityFit: 80,
  },
  strengths: [],
  gaps: [],
  verdict: 'good_fit',
  explanation: 'Good match',
  profileVersion: 1,
  computedAt: '2024-03-15T10:00:00Z',
  computationMethod: 'hybrid',
};

describe('MatchBreakdownModal accessibility', () => {
  it('exposes each score as a progressbar with its value', () => {
    render(<MatchBreakdownModal isOpen onClose={vi.fn()} result={result} />);

    const bars = screen.getAllByRole('progressbar');
    expect(bars).toHaveLength(6);
    expect(bars[0]).toHaveAttribute('value', '80');
    expect(bars[0]).toHaveAttribute('max', '100');
    expect(bars[0]).toHaveAccessibleName('Role Fit');
  });
});
