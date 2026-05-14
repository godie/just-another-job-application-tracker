// src/components/JobSearchForm.tsx
import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { TagInput } from './ui/TagInput';
import { Button } from './ui';

import type { JobSearchParams, JobSearchSource } from '../types/jobSearch';

interface JobSearchFormProps {
  onSearch: (params: JobSearchParams) => void;
  isSearching: boolean;
  defaultKeywords?: string[];
  defaultLocation?: string;
  defaultSource?: JobSearchSource;
}

const EMPTY_TAGS: string[] = [];

/**
 * Compact inline search bar for finding jobs via the API proxy.
 * Supports Jooble, TheirStack, or both sources.
 * Replaces the ATSSearch collapse section with a permanent, always-visible form.
 */
export const JobSearchForm: React.FC<JobSearchFormProps> = ({
  onSearch,
  isSearching,
  defaultKeywords = EMPTY_TAGS,
  defaultLocation = '',
  defaultSource = 'both',
}) => {
  const { t } = useTranslation();

  const [keywords, setKeywords] = useState<string[]>(defaultKeywords);
  const [location, setLocation] = useState(defaultLocation);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [source, setSource] = useState<JobSearchSource>(defaultSource);
  const [techStack, setTechStack] = useState<string[]>([]);

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
      className="bg-earth-50 dark:bg-earth-800 rounded-lg p-4 mb-6 border border-earth-200 dark:border-earth-700"
    >
      {/* Row 1: Keywords + Location + Remote + Search button */}
      <div className="flex flex-col lg:flex-row gap-4 items-end">
        {/* Keywords TagInput */}
        <div className="flex-1 min-w-0">
          <TagInput
            label={t('opportunities.jobSearch.keywords', 'Keywords')}
            tags={keywords}
            onChange={setKeywords}
            placeholder="customer success engineer, react developer"
          />
          <p className="text-xs text-earth-400 dark:text-earth-500 mt-1">
            {t('opportunities.jobSearch.keywordsHint', 'Try job titles, skills, or companies')}
          </p>
        </div>

        {/* Location input */}
        <div className="w-full lg:w-48 flex-shrink-0">
          <label className="block text-sm font-bold text-earth-700 dark:text-earth-300 mb-2">
            {t('opportunities.jobSearch.location', 'Location')}
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="remote, London, SF"
            className="w-full px-4 py-3 border border-earth-300 dark:border-earth-600 rounded focus:ring-2 focus:ring-sage-500 focus:border-sage-500 bg-white dark:bg-earth-800 text-earth-900 dark:text-earth-100 transition-all"
          />
          <p className="text-xs text-earth-400 dark:text-earth-500 mt-1">
            {t('opportunities.jobSearch.locationHint', 'City, country, or remote')}
          </p>
        </div>

        {/* Remote toggle */}
        <div className="flex items-center gap-2 flex-shrink-0 pt-1 lg:pt-0">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remoteOnly}
              onChange={(e) => setRemoteOnly(e.target.checked)}
              className="size-4 rounded border-earth-300 dark:border-earth-600 text-sage-600 focus:ring-sage-500"
            />
            <span className="text-sm font-medium text-earth-700 dark:text-earth-300 whitespace-nowrap">
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
            className="w-full lg:w-auto px-6 py-3 bg-sage-600 hover:bg-sage-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded transition-colors flex items-center justify-center gap-2"
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
        <summary className="text-xs text-earth-400 dark:text-earth-500 cursor-pointer hover:text-earth-600 dark:hover:text-earth-300 transition-colors select-none">
          {t('opportunities.jobSearch.advancedFilters', 'Advanced filters')}
        </summary>
        <div className="mt-3 flex flex-col lg:flex-row gap-4 items-end">
          {/* Source selector */}
          <div className="w-full lg:w-48 flex-shrink-0">
            <label className="block text-sm font-bold text-earth-700 dark:text-earth-300 mb-2">
              {t('opportunities.jobSearch.source', 'Source')}
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as JobSearchSource)}
              className="w-full px-3 py-3 border border-earth-300 dark:border-earth-600 rounded focus:ring-2 focus:ring-sage-500 focus:border-sage-500 bg-white dark:bg-earth-800 text-earth-900 dark:text-earth-100 transition-all text-sm"
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
                onChange={setTechStack}
                placeholder="react, typescript, python, aws"
              />
              <p className="text-xs text-earth-400 dark:text-earth-500 mt-1">
                {t('opportunities.jobSearch.techStackHint', 'Filter by technologies — uses TheirStack data')}
              </p>
            </div>
          )}
        </div>
      </details>
    </form>
  );
};
