// src/pages/OpportunitiesPage.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSEO } from '../seo/useSEO';
import Footer from '../components/Footer';
import { JobSearchForm } from '../components/JobSearchForm';
import { JobSearchResults } from '../components/JobSearchResults';
import { searchJobs } from '../utils/jobSearchApi';
import { useAlert } from '../components/AlertProvider';
import { convertOpportunityToApplication } from '../storage/opportunities';
import type { JobOpportunity } from '../types/opportunities';
import OpportunityForm from '../components/OpportunityForm';
import ConfirmDialog from '../components/ConfirmDialog';


import { useOpportunitiesStore } from '../stores/opportunitiesStore';
import { useApplicationsStore } from '../stores/applicationsStore';
import OpportunitiesEmptyState from '../components/OpportunitiesEmptyState';
import OpportunitiesTable from '../components/OpportunitiesTable';
import { useFormatDate } from '../hooks/useFormatDate';
import { PageHeader } from '../components/ui/PageHeader';

import { type PageType } from '../App';
import type { JobSearchParams, UnifiedJobResult } from '../types/jobSearch';
import { getTodayDate, parseDateString } from '../utils/dateHelpers';

interface OpportunitiesPageContentProps {
  onNavigate?: (page: PageType) => void;
}

const OpportunitiesPageContent: React.FC<OpportunitiesPageContentProps> = () => {
  const { t } = useTranslation();
  const { showSuccess, showError } = useAlert();

  useSEO({
    title: t('seo.opportunities.title'),
    description: t('seo.opportunities.description'),
  });
  const { formatLocaleDate } = useFormatDate();
  
  // Use Zustand stores
  const opportunities = useOpportunitiesStore((state) => state.opportunities);
  const loadOpportunities = useOpportunitiesStore((state) => state.loadOpportunities);
  const addOpportunity = useOpportunitiesStore((state) => state.addOpportunity);
  const deleteOpportunity = useOpportunitiesStore((state) => state.deleteOpportunity);
  const refreshOpportunities = useOpportunitiesStore((state) => state.refreshOpportunities);
  
  const addApplication = useApplicationsStore((state) => state.addApplication);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Job search state
  const [searchResults, setSearchResults] = useState<UnifiedJobResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const [searchErrors, setSearchErrors] = useState<Array<{ source: string; message: string }>>([]);
  const [searchParams, setSearchParams] = useState<JobSearchParams | null>(null);

  // Track IDs of jobs already saved as opportunities
  const [savedSearchIds, setSavedSearchIds] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    opportunity: JobOpportunity | null;
  }>({
    isOpen: false,
    opportunity: null,
  });

  useEffect(() => {
    loadOpportunities();
    
    // Listen for storage changes (from Chrome extension)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'jobOpportunities' || e.key === null) {
        refreshOpportunities();
      }
    };
    
    // Listen for custom event from webapp-content script
    const handleOpportunitiesUpdate = () => {
      refreshOpportunities();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('jobOpportunitiesUpdated', handleOpportunitiesUpdate as EventListener);
    
    // Also poll for changes (in case extension uses chrome.storage.local)
    const interval = setInterval(() => {
      refreshOpportunities();
    }, 2000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('jobOpportunitiesUpdated', handleOpportunitiesUpdate as EventListener);
      clearInterval(interval);
    };
  }, [loadOpportunities, refreshOpportunities]);

  const handleApply = (opportunity: JobOpportunity) => {
    try {
      // Convert to application
      const application = convertOpportunityToApplication(opportunity);
      
      // Add application using store
      addApplication(application);
      
      // Remove opportunity (same as Delete so extension doesn't re-sync it)
      deleteOpportunity(opportunity.id);
      try {
        window.postMessage({
          type: 'DELETE_OPPORTUNITY',
          opportunityId: opportunity.id,
        }, window.location.origin);
      } catch (error) {
        console.debug('Extension not available for delete sync:', error);
      }
      
      showSuccess(t('opportunities.success.addedToApps', { position: opportunity.position, company: opportunity.company }));
    } catch (error) {
      console.error('Error converting opportunity:', error);
      showError(t('opportunities.success.convertError'));
    }
  };

  const handleDelete = (opportunity: JobOpportunity) => {
    setDeleteConfirm({ isOpen: true, opportunity });
  };

  const confirmDelete = () => {
    if (deleteConfirm.opportunity) {
      const opportunity = deleteConfirm.opportunity;
      deleteOpportunity(opportunity.id);
      
      // Also delete from chrome.storage.local via content script
      try {
        console.log('[Web App] Sending DELETE_OPPORTUNITY message to extension:', opportunity.id);
        window.postMessage({
          type: 'DELETE_OPPORTUNITY',
          opportunityId: opportunity.id,
        }, window.location.origin);
      } catch (error) {
        console.error('Error sending delete message to extension:', error);
      }
      
      showSuccess(t('opportunities.success.deleted', { position: opportunity.position }));
      setDeleteConfirm({ isOpen: false, opportunity: null });
    }
  };

  const handleAddOpportunity = useCallback((opportunityData: Omit<JobOpportunity, 'id' | 'capturedDate'>) => {
    try {
      const newOpportunity = addOpportunity(opportunityData);
      showSuccess(t('opportunities.success.added', { position: opportunityData.position, company: opportunityData.company }));
      
      // Also sync to chrome.storage.local if extension is available
      try {
        window.postMessage({
          type: 'SYNC_OPPORTUNITY',
          data: newOpportunity,
        }, window.location.origin);
      } catch (error) {
        // Ignore if extension is not available
        console.debug('Extension not available for sync:', error);
      }
    } catch (error) {
      console.error('Error adding opportunity:', error);
      showError(t('opportunities.success.addError'));
    }
  }, [addOpportunity, showSuccess, showError, t]);

  // ── Job Search Handlers ──
  const handleJobSearch = useCallback(async (params: JobSearchParams) => {
    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);
    setSearchErrors([]);
    setSearchParams(params);
    setSearchTotal(0);
    setSearchHasMore(false);

    try {
      const response = await searchJobs(params);
      setSearchResults(response.results);
      setSearchTotal(response.total);
      setSearchHasMore(response.hasMore);
      if (response.errors?.length) {
        setSearchErrors(response.errors);
      }
    } catch (err) {
      const error = err as { message?: string };
      setSearchError(error.message ?? 'Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (!searchParams || isSearching) return;

    setIsSearching(true);
    setSearchError(null);

    try {
      const nextParams = { ...searchParams, page: searchParams.page + 1 };
      setSearchParams(nextParams);
      const response = await searchJobs(nextParams);
      setSearchResults((prev) => [...prev, ...response.results]);
      setSearchTotal(response.total);
      setSearchHasMore(response.hasMore);
      if (response.errors?.length) {
        setSearchErrors((prev) => [...prev, ...response.errors]);
      }
    } catch (err) {
      const error = err as { message?: string };
      setSearchError(error.message ?? 'Failed to load more results.');
    } finally {
      setIsSearching(false);
    }
  }, [searchParams, isSearching]);

  const handleSaveAsOpportunity = useCallback((job: UnifiedJobResult) => {
    handleAddOpportunity({
      position: job.position,
      company: job.company,
      link: job.url,
      description: job.description ?? undefined,
      location: job.location ?? undefined,
      jobType: job.remote ? 'Remote' : undefined,
      salary: job.salary ?? undefined,
      postedDate: job.postedDate ?? undefined,
    });
    setSavedSearchIds((prev) => new Set([...prev, job.id]));
  }, [handleAddOpportunity]);

  const filteredOpportunities = useMemo(() => {
    if (!searchTerm.trim()) return opportunities;
    
    const normalized = searchTerm.toLowerCase();
    return opportunities.filter(opp => 
      opp.position.toLowerCase().includes(normalized) ||
      opp.company.toLowerCase().includes(normalized) ||
      opp.location?.toLowerCase().includes(normalized) ||
      opp.jobType?.toLowerCase().includes(normalized)
    );
  }, [opportunities, searchTerm]);

  // Derived metrics — asymmetric layout
  const [recentCount, setRecentCount] = useState(0);
  useEffect(() => {
    const oneWeekAgo = getTodayDate();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    setRecentCount(opportunities.filter(opp => {
      const captured = opp.capturedDate ? parseDateString(opp.capturedDate) : null;
      return captured && captured >= oneWeekAgo;
    }).length);
  }, [opportunities]);

  const remoteCount = useMemo(() => {
    return opportunities.filter(opp => 
      opp.location?.toLowerCase().includes('remote') || 
      opp.jobType?.toLowerCase().includes('remote')
    ).length;
  }, [opportunities]);

  return (
    <div className='max-w-7xl mx-auto px-6 lg:px-8 py-8'>
      {/* ── HERO ZONE ── Header + Add Opportunity CTA ── */}
      <PageHeader
        category="Pipeline"
        title={t('opportunities.title')}
        description={t('opportunities.subtitle')}
        actionLabel={t('opportunities.addOpportunity')}
        onAction={() => setIsFormOpen(true)}
      />

      {/* ── METRICS ── Asymmetric layout: Opportunities dominant, Recent & Remote compact ── */}
      <section className='grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10' data-testid='opportunities-metrics'>
        {/* Dominant metric: Total Opportunities — spans 2 columns */}
        <div className='col-span-2 bg-earth-50 dark:bg-earth-800 p-6 border-l-2 border-earth-400 dark:border-earth-500 transition-colors duration-300'>
          <p className='text-sm font-medium text-earth-500 dark:text-earth-400 tracking-wide uppercase'>
            {t('opportunities.metrics.total', 'Total Opportunities')}
          </p>
          <p className='mt-2 font-serif text-5xl sm:text-6xl font-bold text-earth-900 dark:text-earth-50 leading-none'>
            {opportunities.length}
          </p>
        </div>

        {/* Compact metric: Recent (last 7 days) */}
        <div className='bg-sage-50 dark:bg-sage-900/30 p-5 border-l-2 border-sage-400 dark:border-sage-600 transition-colors duration-300'>
          <p className='text-xs font-medium text-sage-600 dark:text-sage-400 tracking-wide uppercase'>
            {t('opportunities.metrics.thisWeek', 'This Week')}
          </p>
          <p className='mt-1 font-serif text-3xl font-bold text-sage-800 dark:text-sage-100'>
            {recentCount}
          </p>
        </div>

        {/* Compact metric: Remote */}
        <div className='bg-earth-100 dark:bg-earth-700/50 p-5 border-l-2 border-earth-500 dark:border-earth-500 transition-colors duration-300'>
          <p className='text-xs font-medium text-earth-600 dark:text-earth-300 tracking-wide uppercase'>
            {t('opportunities.metrics.remote', 'Remote')}
          </p>
          <p className='mt-1 font-serif text-3xl font-bold text-earth-800 dark:text-earth-100'>
            {remoteCount}
          </p>
        </div>
      </section>

      {/* ── JOB SEARCH ── ── */}
      <div className='mb-8'>
        <div className='mb-3'>
          <h2 className='text-xl font-semibold text-earth-800 dark:text-earth-100'>
            {t('opportunities.jobSearch.title')}
          </h2>
          <p className='text-sm text-earth-500 dark:text-earth-400 mt-1'>
            {t('opportunities.jobSearch.subtitle')}
          </p>
        </div>
        <JobSearchForm
          onSearch={handleJobSearch}
          isSearching={isSearching}
        />
        <JobSearchResults
          results={searchResults}
          isLoading={isSearching}
          error={searchError}
          totalCount={searchTotal}
          hasMore={searchHasMore}
          onLoadMore={handleLoadMore}
          onSaveAsOpportunity={handleSaveAsOpportunity}
          savedIds={savedSearchIds}
          errors={searchErrors}
        />
      </div>

      {/* ── CONTENT ── Table or Empty State ── */}
      {opportunities.length === 0 ? (
          <OpportunitiesEmptyState />
        ) : (
          <OpportunitiesTable
            opportunities={opportunities}
            filteredOpportunities={filteredOpportunities}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onApply={handleApply}
            onDelete={handleDelete}
            formatDate={formatLocaleDate}
          />
        )}
      <OpportunityForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleAddOpportunity}
      />
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title={t('opportunities.deleteConfirm.title')}
        message={t('opportunities.deleteConfirm.message', {
          position: deleteConfirm.opportunity?.position,
          company: deleteConfirm.opportunity?.company
        })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        type='danger'
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, opportunity: null })}
      />
      <Footer version="2.1.4" />
    </div>
  );
};

interface OpportunitiesPageProps {
  onNavigate?: (page: PageType) => void;
}

const OpportunitiesPage: React.FC<OpportunitiesPageProps> = ({ onNavigate }) => {
  return <OpportunitiesPageContent onNavigate={onNavigate} />;
};

export default OpportunitiesPage;
