// src/components/MatchBreakdownModal.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MatchBreakdownModal } from './MatchBreakdownModal';
import type { JobMatchResult } from '../types/matching';

function makeResult(overrides: Partial<JobMatchResult> = {}): JobMatchResult {
  return {
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
    strengths: ['Strong skills match', 'Good location fit'],
    gaps: ['Compensation slightly below range'],
    verdict: 'good_fit',
    explanation: 'Good overall match with strong skills alignment.',
    profileVersion: 1,
    computedAt: '2024-03-15T10:00:00Z',
    computationMethod: 'hybrid',
    ...overrides,
  };
}

describe('MatchBreakdownModal', () => {
  it('does not render when closed', () => {
    const { container } = render(
      <MatchBreakdownModal isOpen={false} onClose={vi.fn()} result={makeResult()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('does not render when result is null', () => {
    const { container } = render(
      <MatchBreakdownModal isOpen={true} onClose={vi.fn()} result={null} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders overall score and verdict', () => {
    render(<MatchBreakdownModal isOpen={true} onClose={vi.fn()} result={makeResult()} />);
    expect(screen.getByText('82%')).toBeInTheDocument();
    expect(screen.getByText('good fit')).toBeInTheDocument();
  });

  it('renders opportunity title and company', () => {
    render(
      <MatchBreakdownModal
        isOpen={true}
        onClose={vi.fn()}
        result={makeResult()}
        opportunityTitle="Software Engineer"
        opportunityCompany="Acme"
      />
    );
    expect(screen.getByText(/Software Engineer/)).toBeInTheDocument();
    expect(screen.getByText(/Acme/)).toBeInTheDocument();
  });

  it('renders all subscore bars', () => {
    render(<MatchBreakdownModal isOpen={true} onClose={vi.fn()} result={makeResult()} />);
    expect(screen.getByText('Role Fit')).toBeInTheDocument();
    expect(screen.getByText('History Match')).toBeInTheDocument();
    expect(screen.getByText('Skills Match')).toBeInTheDocument();
    expect(screen.getByText('Location & Work Type')).toBeInTheDocument();
    expect(screen.getByText('Compensation')).toBeInTheDocument();
    expect(screen.getByText('Seniority')).toBeInTheDocument();
  });

  it('renders strengths section', () => {
    render(<MatchBreakdownModal isOpen={true} onClose={vi.fn()} result={makeResult()} />);
    expect(screen.getByText('Strengths')).toBeInTheDocument();
    expect(screen.getByText('Strong skills match')).toBeInTheDocument();
    expect(screen.getByText('Good location fit')).toBeInTheDocument();
  });

  it('renders gaps section', () => {
    render(<MatchBreakdownModal isOpen={true} onClose={vi.fn()} result={makeResult()} />);
    expect(screen.getByText('Potential Gaps')).toBeInTheDocument();
    expect(screen.getByText('Compensation slightly below range')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const handleClose = vi.fn();
    render(<MatchBreakdownModal isOpen={true} onClose={handleClose} result={makeResult()} />);
    fireEvent.click(screen.getByLabelText('Close'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when overlay clicked', () => {
    const handleClose = vi.fn();
    const { container } = render(
      <MatchBreakdownModal isOpen={true} onClose={handleClose} result={makeResult()} />
    );
    // Click the backdrop (the outer div with role="dialog")
    const backdrop = container.querySelector('[role="dialog"]');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(handleClose).toHaveBeenCalled();
    }
  });

  it('does not render strengths section when empty', () => {
    const result = makeResult({ strengths: [] });
    render(<MatchBreakdownModal isOpen={true} onClose={vi.fn()} result={result} />);
    expect(screen.queryByText('Strengths')).not.toBeInTheDocument();
  });

  it('does not render gaps section when empty', () => {
    const result = makeResult({ gaps: [] });
    render(<MatchBreakdownModal isOpen={true} onClose={vi.fn()} result={result} />);
    expect(screen.queryByText('Potential Gaps')).not.toBeInTheDocument();
  });
});
