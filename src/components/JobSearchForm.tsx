import React, { useReducer, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { TagInput } from './ui/TagInput';
import { Button } from './ui/Button';

import type { JobSearchParams, JobSearchSource } from '../types/jobSearch';

interface JobSearchFormProps {
  onSearch: (params: JobSearchParams) => void;
  isSearching: boolean;
  defaultKeywords?: string[];
  defaultLocation?: string;
  defaultSource?: JobSearchSource;
}

const EMPTY_TAGS: string[] = [];

interface JobSearchFormState {
  keywords: string[];
  location: string;
  remoteOnly: boolean;
  source: JobSearchSource;
  techStack: string[];
}

type JobSearchFormAction =
  | { type: 'SET_KEYWORDS'; value: string[] }
  | { type: 'SET_LOCATION'; value: string }
  | { type: 'SET_REMOTE_ONLY'; value: boolean }
  | { type: 'SET_SOURCE'; value: JobSearchSource }
  | { type: 'SET_TECH_STACK'; value: string[] };

function jobSearchFormReducer(state: JobSearchFormState, action: JobSearchFormAction): JobSearchFormState {
  switch (action.type) {
    case 'SET_KEYWORDS':
      return { ...state, keywords: action.value };
    case 'SET_LOCATION':
      return { ...state, location: action.value };
    case 'SET_REMOTE_ONLY':
      return { ...state, remoteOnly: action.value };
    case 'SET_SOURCE':
      return { ...state, source: action.value };
    case 'SET_TECH_STACK':
      return { ...state, techStack: action.value };
    default:
      return state;
  }
}

export const JobSearchForm: React.FC<JobSearchFormProps> = ({
  onSearch,
  isSearching,
  defaultKeywords = EMPTY_TAGS,
  defaultLocation = '',
  defaultSource = 'both',
}) => {
  const { t } = useTranslation();

  const [state, dispatch] = useReducer(jobSearchFormReducer, {
    keywords: defaultKeywords,
    location: defaultLocation,
    remoteOnly: false,
    source: defaultSource,
    techStack: [],
  });

  const { keywords, location, remoteOnly, source, techStack } = state;

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (keywords.length === 0) return;

      onSearch({
        keywords: keywords.join(' '),
        location: location || undefined,
        remoteOnly,
        source,
        techStack,
        page: 1,
        pageSize: 20,
      });
    },
    [keywords, location, remoteOnly, source, techStack, onSearch],
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-muted rounded-lg p-4 mb-6 border border-border"
    >
      {/* Row 1: Keywords + Location + Remote + Search button */}
      <div className="flex flex-col lg:flex-row gap-4 items-end">
        {/* Keywords TagInput */}
        <div className="flex-1 min-w-0">
          <TagInput
            label={t('opportunities.jobSearch.keywords', 'Keywords')}
            tags={keywords}
            onChange={(tags) => dispatch({ type: 'SET_KEYWORDS', value: tags })}
            placeholder="customer success engineer, react developer"
          />
          <p className="text-xs text-muted-foreground/70 mt-1">
            {t('opportunities.jobSearch.keywordsHint', 'Try job titles, skills, or companies')}
          </p>
        </div>

        {/* Location input */}
        <div className="w-full lg:w-48 flex-shrink-0">
          <label htmlFor="job-search-location" className="block text-sm font-bold text-foreground mb-2">
            {t('opportunities.jobSearch.location', 'Location')}
          </label>
          <input
            id="job-search-location"
            type="text"
            value={location}
            onChange={(e) => dispatch({ type: 'SET_LOCATION', value: e.target.value })}
            placeholder="remote, London, SF"
            aria-label={t('opportunities.jobSearch.location', 'Location')}
            className="w-full px-4 py-3 border border-border rounded focus:ring-2 focus:ring-ring focus:border-ring bg-background text-foreground transition-all"
          />
          <p className="text-xs text-muted-foreground/70 mt-1">
            {t('opportunities.jobSearch.locationHint', 'City, country, or remote')}
          </p>
        </div>

        {/* Remote toggle */}
        <div className="flex items-center gap-2 flex-shrink-0 pt-1 lg:pt-0">
          <label htmlFor="job-search-remote" className="flex items-center gap-2 cursor-pointer select-none">
            <input
              id="job-search-remote"
              type="checkbox"
              checked={remoteOnly}
              onChange={(e) => dispatch({ type: 'SET_REMOTE_ONLY', value: e.target.checked })}
              aria-label={t('opportunities.jobSearch.remoteOnly', 'Remote only')}
              className="size-4 rounded border-border text-primary focus:ring-ring"
            />
            <span className="text-sm font-medium text-foreground whitespace-nowrap">
              {t('opportunities.jobSearch.remoteOnly', 'Remote only')}
            </span>
          </label>
        </div>

        {/* Search button */}
        <div className="flex-shrink-0 w-full lg:w-auto">
          <Button
            type="submit"
            variant="primary"
            disabled={isSearching || keywords.length === 0}
            className="w-full lg:w-auto px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
          >
            {isSearching ? (
              <>
                <svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {t('opportunities.jobSearch.searching', 'Searching…')}
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {t('opportunities.jobSearch.search', 'Search')}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Row 2: Source picker + Tech stack (collapsible advanced) */}
      <details className="mt-4 group">
        <summary className="text-xs text-muted-foreground/70 cursor-pointer hover:text-muted-foreground transition-colors select-none">
          {t('opportunities.jobSearch.advancedFilters', 'Advanced filters')}
        </summary>
        <div className="mt-3 flex flex-col lg:flex-row gap-4 items-end">
          {/* Source selector */}
          <div className="w-full lg:w-48 flex-shrink-0">
            <label className="block text-sm font-bold text-foreground mb-2">
              {t('opportunities.jobSearch.source', 'Source')}
            </label>
            <select
              value={source}
              onChange={(e) => dispatch({ type: 'SET_SOURCE', value: e.target.value as JobSearchSource })}
              aria-label={t('opportunities.jobSearch.source', 'Source')}
              className="w-full p-3 border border-border rounded focus:ring-2 focus:ring-ring focus:border-ring bg-background text-foreground transition-all text-sm"
            >
              <option value="all">{t('opportunities.jobSearch.sourceAll', 'All (Jooble + TheirStack + Adzuna + Careerjet)')}</option>
              <option value="both">{t('opportunities.jobSearch.sourceBoth', 'Both (Jooble + TheirStack)')}</option>
              <option value="jooble">{t('opportunities.jobSearch.sourceJooble', 'Jooble')}</option>
              <option value="theirstack">{t('opportunities.jobSearch.sourceTheirstack', 'TheirStack')}</option>
              <option value="adzuna">{t('opportunities.jobSearch.sourceAdzuna', 'Adzuna')}</option>
              <option value="careerjet">{t('opportunities.jobSearch.sourceCareerjet', 'Careerjet')}</option>
            </select>
          </div>

          {/* Tech stack TagInput (TheirStack only) */}
          {(source === 'theirstack' || source === 'both') && (
            <div className="flex-1 min-w-0">
              <TagInput
                label={t('opportunities.jobSearch.techStack', 'Tech Stack')}
                tags={techStack}
                onChange={(tags) => dispatch({ type: 'SET_TECH_STACK', value: tags })}
                placeholder="react, typescript, python, aws"
              />
              <p className="text-xs text-muted-foreground/70 mt-1">
                {t('opportunities.jobSearch.techStackHint', 'Filter by technologies — uses TheirStack data')}
              </p>
            </div>
          )}
        </div>
      </details>
    </form>
  );
};