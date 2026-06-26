import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

import type { UnifiedJobResult } from '../types/jobSearch';

interface JobSearchResultsProps {
  results: UnifiedJobResult[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  hasMore: boolean;
  onLoadMore: () => void;
  onSaveAsOpportunity: (result: UnifiedJobResult) => void;
  savedIds: Set<string>;
  errors?: Array<{ source: string; message: string }>;
}

const SOURCE_COLORS: Record<string, string> = {
  jooble: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-200',
  theirstack: 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-200',
  adzuna: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-200',
  careerjet: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-200',
};

const TECH_COLORS = [
  'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-200',
  'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-200',
  'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-200',
  'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-200',
];

export const JobSearchResults: React.FC<JobSearchResultsProps> = ({
  results,
  isLoading,
  error,
  totalCount,
  hasMore,
  onLoadMore,
  onSaveAsOpportunity,
  savedIds,
  errors,
}) => {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading && results.length === 0) {
    return (
      <div className="mb-8 space-y-4" data-testid="job-search-loading">
        {[1, 2, 3].map((i) => (
          <Card key={`skeleton-${i}`} className="p-5 animate-pulse">
            <div className="h-5 bg-muted rounded w-3/4 mb-3" />
            <div className="h-4 bg-muted/50 rounded w-1/2 mb-2" />
            <div className="h-4 bg-muted/50 rounded w-2/3" />
          </Card>
        ))}
      </div>
    );
  }

  if (error && results.length === 0) {
    return (
      <div className="mb-8" data-testid="job-search-error">
        <Card className="p-6 border-l-2 border-l-red-500 bg-red-50 dark:bg-red-900/20">
          <div className="flex items-start gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="size-5 text-red-500 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-red-800 dark:text-red-200">{error}</p>
              <p className="text-sm text-red-600 dark:text-red-200 mt-1">
                {t('opportunities.jobSearch.noResults', 'No jobs found. Try broader keywords or remove location filter.')}
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (results.length === 0) {
    return null; // Don't show anything before the first search
  }

  return (
    <div className="mb-8" data-testid="job-search-results">
      {/* Header with count and source mix */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">
          {t('opportunities.jobSearch.resultsCount', '{{count}} results', { count: totalCount })}
        </h2>
        <div className="flex items-center gap-2">
          {hasJooble(results) && (
            <Badge className={SOURCE_COLORS.jooble}>
              Jooble
            </Badge>
          )}
          {hasTheirstack(results) && (
            <Badge className={SOURCE_COLORS.theirstack}>
              TheirStack
            </Badge>
          )}
          {hasAdzuna(results) && (
            <Badge className={SOURCE_COLORS.adzuna}>
              Adzuna
            </Badge>
          )}
          {hasCareerjet(results) && (
            <Badge className={SOURCE_COLORS.careerjet}>
              Careerjet
            </Badge>
          )}
        </div>
      </div>

      {/* Partial source errors */}
      {errors && errors.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-sm text-amber-700 dark:text-amber-200">
          {errors.map((e, i) => (
            <span key={e.source}>
              {i > 0 && ' · '}
              <strong className="capitalize">{e.source}</strong>: {e.message}
            </span>
          ))}
        </div>
      )}

      {/* Card list */}
      <div className="space-y-3">
        {results.map((job) => {
          const isSaved = savedIds.has(job.id);
          const isExpanded = expandedId === job.id;

          return (
            <Card
              key={job.id}
              className={`p-4 transition-all hover:shadow-md ${isSaved ? 'border-l-2 border-l-primary opacity-70' : ''}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                {/* Left: job details */}
                <div className="flex-1 min-w-0">
                  {/* Position — clickable */}
                  <h3 className="text-base font-semibold text-foreground mb-1">
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary transition-colors"
                    >
                      {job.position}
                    </a>
                  </h3>

                  {/* Company · Location · Source badge · Remote badge */}
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-2">
                    <span className="font-medium">{job.company}</span>
                    {job.location && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{job.location}</span>
                      </>
                    )}
                    {/* Source badge */}
                    <Badge className={SOURCE_COLORS[job.source] ?? ''}>
                      {job.source === 'theirstack' ? 'TheirStack' : job.source === 'adzuna' ? 'Adzuna' : job.source === 'careerjet' ? 'Careerjet' : 'Jooble'}
                    </Badge>
                    {job.remote && (
                      <Badge variant="outline" className="text-xs">
                        Remote
                      </Badge>
                    )}
                  </div>

                  {/* Salary */}
                  {job.salary && (
                    <p className="text-sm font-medium text-foreground mb-2">
                      {job.salary}
                    </p>
                  )}

                  {/* Tech Stack chips */}
                  {job.techStack && job.techStack.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {job.techStack.slice(0, 6).map((tech, i) => (
                        <span
                          key={tech}
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${TECH_COLORS[i % TECH_COLORS.length]}`}
                        >
                          {tech}
                        </span>
                      ))}
                      {job.techStack.length > 6 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                          +{job.techStack.length - 6}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Description — expandable */}
                  {job.description && (
                    <div className="mt-2">
                      <p
                        className={`text-sm text-muted-foreground ${isExpanded ? '' : 'line-clamp-2'}`}
                      >
                        {job.description}
                      </p>
                      {job.description.length > 150 && (
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : job.id)}
                          className="text-xs text-primary hover:underline mt-1"
                        >
                          {isExpanded ? 'Show less' : 'Show more'}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Posted date */}
                  {job.postedDate && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Posted: {job.postedDate}
                    </p>
                  )}
                </div>

                {/* Right: action buttons */}
                <div className="flex sm:flex-col gap-2 flex-shrink-0">
                  {isSaved ? (
                    <span className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-primary bg-primary/10 rounded">
                      <svg xmlns="http://www.w3.org/2000/svg" className="size-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {t('opportunities.jobSearch.saved', 'Saved!')}
                    </span>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onSaveAsOpportunity(job)}
                      className="text-sm whitespace-nowrap"
                    >
                      {t('opportunities.jobSearch.saveAsOpp', 'Save as Opportunity')}
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(job.url, '_blank', 'noopener,noreferrer')}
                    className="text-sm whitespace-nowrap"
                    title={t('opportunities.jobSearch.openLink', 'Open in new tab')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="mt-6 text-center">
          <Button
            variant="outline"
            onClick={onLoadMore}
            disabled={isLoading}
            className="px-8"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading…
              </span>
            ) : (
              t('opportunities.jobSearch.loadMore', 'Load more results')
            )}
          </Button>
        </div>
      )}

      {/* Error banner for subsequent page errors */}
      {error && results.length > 0 && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-200">
          {error}
        </div>
      )}
    </div>
  );
};


function hasJooble(results: UnifiedJobResult[]): boolean {
  return results.some((r) => r.source === 'jooble');
}

function hasTheirstack(results: UnifiedJobResult[]): boolean {
  return results.some((r) => r.source === 'theirstack');
}

function hasAdzuna(results: UnifiedJobResult[]): boolean {
  return results.some((r) => r.source === 'adzuna');
}

function hasCareerjet(results: UnifiedJobResult[]): boolean {
  return results.some((r) => r.source === 'careerjet');
}