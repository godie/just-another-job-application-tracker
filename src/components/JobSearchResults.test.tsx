import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { JobSearchResults } from './JobSearchResults';
import type { UnifiedJobResult } from '../types/jobSearch';

const mockResults: UnifiedJobResult[] = [
  {
    id: 'jooble_123',
    position: 'Frontend Engineer',
    company: 'TechCorp',
    location: 'Remote',
    remote: true,
    salary: '$120k - $140k',
    description: 'This is a long job description for a frontend engineer role that spans multiple lines to test expandability.',
    url: 'https://example.com/job/123',
    postedDate: '2026-07-01',
    source: 'jooble',
    techStack: ['React', 'TypeScript'],
  },
  {
    id: 'theirstack_456',
    position: 'Backend Engineer',
    company: 'DataCo',
    location: 'San Francisco',
    remote: false,
    salary: '$150k',
    description: 'Backend role.',
    url: 'https://example.com/job/456',
    postedDate: '2026-07-02',
    source: 'theirstack',
    techStack: ['Python', 'Django'],
  },
  {
    id: 'adzuna_789',
    position: 'Fullstack Dev',
    company: 'StartupInc',
    location: 'London',
    remote: false,
    source: 'adzuna',
    techStack: [],
    url: 'https://example.com/job/789',
  },
  {
    id: 'careerjet_101',
    position: 'DevOps Engineer',
    company: 'CloudCo',
    location: null,
    remote: true,
    source: 'careerjet',
    techStack: [],
    url: 'https://example.com/job/101',
  },
];

describe('JobSearchResults', () => {
  const defaultProps = {
    results: mockResults,
    isLoading: false,
    error: null,
    totalCount: 4,
    hasMore: true,
    onLoadMore: vi.fn(),
    onSaveAsOpportunity: vi.fn(),
    savedIds: new Set<string>(),
  };

  it('renders loading state when results are empty', () => {
    render(<JobSearchResults {...defaultProps} results={[]} isLoading={true} />);
    expect(screen.getByTestId('job-search-loading')).toBeInTheDocument();
  });

  it('renders error state when results are empty', () => {
    render(<JobSearchResults {...defaultProps} results={[]} error="API rate limit exceeded" />);
    expect(screen.getByTestId('job-search-error')).toBeInTheDocument();
    expect(screen.getByText('API rate limit exceeded')).toBeInTheDocument();
  });

  it('returns null when results are empty and not loading/error', () => {
    const { container } = render(<JobSearchResults {...defaultProps} results={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders results count and all source badges in header', () => {
    render(<JobSearchResults {...defaultProps} />);
    expect(screen.getByText('4 results')).toBeInTheDocument();
    expect(screen.getAllByText('Jooble').length).toBeGreaterThanOrEqual(2); // header badge + card badge
    expect(screen.getAllByText('TheirStack').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Adzuna').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Careerjet').length).toBeGreaterThanOrEqual(2);
  });

  it('calls onSaveAsOpportunity when Save as Opportunity button is clicked', () => {
    const onSave = vi.fn();
    render(<JobSearchResults {...defaultProps} onSaveAsOpportunity={onSave} />);

    const saveButtons = screen.getAllByRole('button', { name: /save as opportunity/i });
    fireEvent.click(saveButtons[0]);
    expect(onSave).toHaveBeenCalledWith(mockResults[0]);
  });

  it('shows Saved badge for saved job IDs', () => {
    render(<JobSearchResults {...defaultProps} savedIds={new Set(['jooble_123'])} />);
    expect(screen.getByText('Saved!')).toBeInTheDocument();
  });

  it('calls onLoadMore when Load more results is clicked', () => {
    const onLoadMore = vi.fn();
    render(<JobSearchResults {...defaultProps} onLoadMore={onLoadMore} />);

    const loadMoreBtn = screen.getByRole('button', { name: /load more results/i });
    fireEvent.click(loadMoreBtn);
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('renders partial source errors when present', () => {
    const errors = [{ source: 'adzuna', message: 'Timeout' }];
    render(<JobSearchResults {...defaultProps} errors={errors} />);
    expect(screen.getByText('adzuna')).toBeInTheDocument();
    expect(screen.getByText(/Timeout/)).toBeInTheDocument();
  });
});
