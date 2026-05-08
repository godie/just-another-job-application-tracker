// src/components/RecommendationPanel.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecommendationPanel } from './RecommendationPanel';
import type { JobOpportunity } from '../types/opportunities';
import type { JobMatchResult } from '../types/matching';

function makeOpportunity(overrides: Partial<JobOpportunity> = {}): JobOpportunity {
  return {
    id: 'opp-1',
    position: 'Senior Frontend Engineer',
    company: 'TechCorp',
    link: 'https://example.com/job1',
    location: 'Remote',
    jobType: 'Remote',
    capturedDate: '2024-03-15',
    ...overrides,
  };
}

function makeMatchResult(overrides: Partial<JobMatchResult> = {}): JobMatchResult {
  return {
    opportunityId: 'opp-1',
    overallScore: 85,
    confidence: 'high',
    subscores: {
      semanticFit: 80,
      historicalFit: 75,
      skillsFit: 90,
      locationWorkTypeFit: 95,
      compensationFit: 70,
      seniorityFit: 85,
    },
    strengths: ['Strong React match', 'Remote preference aligned'],
    gaps: [],
    verdict: 'excellent_fit',
    explanation: 'Excellent match based on skills and remote preference.',
    profileVersion: 1,
    computedAt: new Date().toISOString(),
    computationMethod: 'hybrid',
    ...overrides,
  };
}

describe('RecommendationPanel', () => {
  it('shows empty state when no recommendations', () => {
    render(<RecommendationPanel recommendations={[]} />);
    expect(screen.getByText('Top Matches for You')).toBeInTheDocument();
    expect(
      screen.getByText(/No matching opportunities yet/)
    ).toBeInTheDocument();
  });

  it('renders recommendations with match badges', () => {
    const recommendations = [
      {
        opportunity: makeOpportunity(),
        matchResult: makeMatchResult(),
      },
    ];
    render(<RecommendationPanel recommendations={recommendations} />);
    expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
  });

  it('truncates to maxDisplay items', () => {
    const recommendations = Array.from({ length: 10 }, (_, i) => ({
      opportunity: makeOpportunity({ id: `opp-${i}`, position: `Job ${i}` }),
      matchResult: makeMatchResult({ opportunityId: `opp-${i}`, overallScore: 80 - i }),
    }));
    render(<RecommendationPanel recommendations={recommendations} maxDisplay={3} />);
    expect(screen.getByText('Job 0')).toBeInTheDocument();
    expect(screen.getByText('Job 1')).toBeInTheDocument();
    expect(screen.getByText('Job 2')).toBeInTheDocument();
    expect(screen.queryByText('Job 3')).not.toBeInTheDocument();
  });

  it('shows View all button when showViewAll is true', () => {
    const handleViewAll = vi.fn();
    render(
      <RecommendationPanel
        recommendations={[
          { opportunity: makeOpportunity(), matchResult: makeMatchResult() },
        ]}
        showViewAll
        onViewAll={handleViewAll}
      />
    );
    fireEvent.click(screen.getByText('View all'));
    expect(handleViewAll).toHaveBeenCalledTimes(1);
  });

  it('calls onApply when apply button clicked', () => {
    const handleApply = vi.fn();
    render(
      <RecommendationPanel
        recommendations={[
          { opportunity: makeOpportunity(), matchResult: makeMatchResult() },
        ]}
        onApply={handleApply}
      />
    );
    fireEvent.click(screen.getByText('Apply'));
    expect(handleApply).toHaveBeenCalledWith(expect.objectContaining({ id: 'opp-1' }));
  });

  it('renders custom title', () => {
    render(
      <RecommendationPanel
        recommendations={[]}
        title="My Custom Title"
      />
    );
    expect(screen.getByText('My Custom Title')).toBeInTheDocument();
  });

  it('renders opportunity metadata', () => {
    render(
      <RecommendationPanel
        recommendations={[
          {
            opportunity: makeOpportunity({ location: 'Berlin', jobType: 'Hybrid' }),
            matchResult: makeMatchResult(),
          },
        ]}
      />
    );
    expect(screen.getByText(/Berlin/)).toBeInTheDocument();
    expect(screen.getByText(/Hybrid/)).toBeInTheDocument();
  });

  it('does not show apply button when onApply is not provided', () => {
    render(
      <RecommendationPanel
        recommendations={[
          { opportunity: makeOpportunity(), matchResult: makeMatchResult() },
        ]}
      />
    );
    expect(screen.queryByText('Apply')).not.toBeInTheDocument();
  });

  it('does not show View all when showViewAll is false', () => {
    render(
      <RecommendationPanel
        recommendations={[
          { opportunity: makeOpportunity(), matchResult: makeMatchResult() },
        ]}
        showViewAll={false}
      />
    );
    expect(screen.queryByText('View all')).not.toBeInTheDocument();
  });

  it('renders strength tags', () => {
    render(
      <RecommendationPanel
        recommendations={[
          {
            opportunity: makeOpportunity(),
            matchResult: makeMatchResult({
              strengths: ['React match', 'Remote aligned', 'Senior level'],
            }),
          },
        ]}
      />
    );
    expect(screen.getByText('React match')).toBeInTheDocument();
    expect(screen.getByText('Remote aligned')).toBeInTheDocument();
    expect(screen.queryByText('Senior level')).not.toBeInTheDocument(); // max 2
  });
});
