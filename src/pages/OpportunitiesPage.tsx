import React, { useReducer, useEffect, useMemo, useCallback, useRef } from 'react';
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

interface OpportunitiesPageState {
  searchTerm: string;
  isFormOpen: boolean;
  searchResults: UnifiedJobResult[];
  isSearching: boolean;
  searchError: string | null;
  searchTotal: number;
  searchHasMore: boolean;
  searchErrors: Array<{ source: string; message: string }>;
  savedSearchIds: Set<string>;
  deleteConfirm: { isOpen: boolean; opportunity: JobOpportunity | null };
}

type OpportunitiesPageAction =
  | { type: 'SET_SEARCH_TERM'; value: string }
  | { type: 'TOGGLE_FORM'; value: boolean }
  | { type: 'SET_SEARCH_RESULTS'; value: UnifiedJobResult[] }
  | { type: 'SET_IS_SEARCHING'; value: boolean }
  | { type: 'SET_SEARCH_ERROR'; value: string | null }
  | { type: 'SET_SEARCH_TOTAL'; value: number }
  | { type: 'SET_SEARCH_HAS_MORE'; value: boolean }
  | { type: 'SET_SEARCH_ERRORS'; value: Array<{ source: string; message: string }> }
  | { type: 'APPEND_SEARCH_RESULTS'; value: UnifiedJobResult[] }
  | { type: 'APPEND_SEARCH_ERRORS'; value: Array<{ source: string; message: string }> }
  | { type: 'ADD_SAVED_SEARCH_IDS'; value: string[] }
  | { type: 'SET_DELETE_CONFIRM'; value: { isOpen: boolean; opportunity: JobOpportunity | null } };

function opportunitiesPageReducer(state: OpportunitiesPageState, action: OpportunitiesPageAction): OpportunitiesPageState {
  switch (action.type) {
    case 'SET_SEARCH_TERM':
      return { ...state, searchTerm: action.value };
    case 'TOGGLE_FORM':
      return { ...state, isFormOpen: action.value };
    case 'SET_SEARCH_RESULTS':
      return { ...state, searchResults: action.value };
    case 'SET_IS_SEARCHING':
      return { ...state, isSearching: action.value };
    case 'SET_SEARCH_ERROR':
      return { ...state, searchError: action.value };
    case 'SET_SEARCH_TOTAL':
      return { ...state, searchTotal: action.value };
    case 'SET_SEARCH_HAS_MORE':
      return { ...state, searchHasMore: action.value };
    case 'SET_SEARCH_ERRORS':
      return { ...state, searchErrors: action.value };
    case 'APPEND_SEARCH_RESULTS':
      return { ...state, searchResults: [...state.searchResults, ...action.value] };
    case 'APPEND_SEARCH_ERRORS':
      return { ...state, searchErrors: [...state.searchErrors, ...action.value] };
    case 'ADD_SAVED_SEARCH_IDS':
      return { ...state, savedSearchIds: new Set<string>([...state.savedSearchIds, ...action.value]) };
    case 'SET_DELETE_CONFIRM':
      return { ...state, deleteConfirm: action.value };
    default:
      return state;
  }
}

interface OpportunitiesPageContentProps {
  onNavigate?: (page: PageType) => void;
}

const OpportunitiesPageContent: React.FC<OpportunitiesPageContentProps> = () => {
  const { t } = useTranslation();

  useSEO({
    title: t('seo.opportunities.title'),
    description: t('seo.opportunities.description'),
  });

  const { formatLocaleDate } = useFormatDate();
  const manager = useOpportunitiesManager();
  const opportunities = manager.opportunities;

  return (
    <div className='max-w-7xl mx-auto px-6 lg:px-8 py-8'>
      {/* ── HERO ZONE ── Header + Add Opportunity CTA ── */}
      <PageHeader
        category="Pipeline"
        title={t('opportunities.title')}
        description={t('opportunities.subtitle')}
        actionLabel={t('opportunities.addOpportunity')}
        onAction={manager.openForm}
      />

      {/* ── METRICS ── Asymmetric layout: Opportunities dominant, Recent & Remote compact ── */}
      <OpportunitiesMetrics
        total={opportunities.length}
        recentCount={manager.recentCount}
        remoteCount={manager.remoteCount}
      />

      {/* ── JOB SEARCH ── ── */}
      <OpportunitiesJobSearchSection
        isSearching={manager.isSearching}
        searchResults={manager.searchResults}
        searchError={manager.searchError}
        searchTotal={manager.searchTotal}
        searchHasMore={manager.searchHasMore}
        searchErrors={manager.searchErrors}
        savedSearchIds={manager.savedSearchIds}
        onSearch={manager.handleJobSearch}
        onLoadMore={manager.handleLoadMore}
        onSaveAsOpportunity={manager.handleSaveAsOpportunity}
      />

      {/* ── CONTENT ── Table or Empty State ── */}
      {opportunities.length === 0 ? (
        <OpportunitiesEmptyState />
      ) : (
        <OpportunitiesTable
          opportunities={opportunities}
          filteredOpportunities={manager.filteredOpportunities}
          searchTerm={manager.searchTerm}
          onSearchChange={manager.setSearchTerm}
          onApply={manager.handleApply}
          onDelete={manager.handleDelete}
          formatDate={formatLocaleDate}
        />
      )}

      <OpportunityForm
        isOpen={manager.isFormOpen}
        onClose={manager.closeForm}
        onSave={manager.handleAddOpportunity}
      />
      <ConfirmDialog
        isOpen={manager.deleteConfirm.isOpen}
        title={t('opportunities.deleteConfirm.title')}
        message={t('opportunities.deleteConfirm.message', {
          position: manager.deleteConfirm.opportunity?.position,
          company: manager.deleteConfirm.opportunity?.company
        })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        type='danger'
        onConfirm={manager.confirmDelete}
        onCancel={manager.closeDeleteConfirm}
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

interface OpportunitiesMetricsProps {
  total: number;
  recentCount: number;
  remoteCount: number;
}

const OpportunitiesMetrics: React.FC<OpportunitiesMetricsProps> = ({ total, recentCount, remoteCount }) => {
  const { t } = useTranslation();
  return (
    <section className='grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10' data-testid='opportunities-metrics'>
      {/* Dominant metric: Total Opportunities — spans 2 columns */}
      <div className='col-span-2 bg-muted p-6 border-l-2 border-border transition-colors duration-300'>
        <p className='text-sm font-medium text-muted-foreground tracking-wide uppercase'>
          {t('opportunities.metrics.total', 'Total Opportunities')}
        </p>
        <p className='mt-2 font-serif text-5xl sm:text-6xl font-bold text-foreground leading-none'>
          {total}
        </p>
      </div>

      {/* Compact metric: Recent (last 7 days) */}
      <div className='bg-primary/5 dark:bg-primary/10 p-5 border-l-2 border-primary/30 dark:border-primary transition-colors duration-300'>
        <p className='text-xs font-medium text-primary tracking-wide uppercase'>
          {t('opportunities.metrics.thisWeek', 'This Week')}
        </p>
        <p className='mt-1 font-serif text-3xl font-bold text-primary dark:text-primary-foreground'>
          {recentCount}
        </p>
      </div>

      {/* Compact metric: Remote */}
      <div className='bg-muted p-5 border-l-2 border-border transition-colors duration-300'>
        <p className='text-xs font-medium text-muted-foreground tracking-wide uppercase'>
          {t('opportunities.metrics.remote', 'Remote')}
        </p>
        <p className='mt-1 font-serif text-3xl font-bold text-foreground'>
          {remoteCount}
        </p>
      </div>
    </section>
  );
};

interface OpportunitiesJobSearchSectionProps {
  isSearching: boolean;
  searchResults: UnifiedJobResult[];
  searchError: string | null;
  searchTotal: number;
  searchHasMore: boolean;
  searchErrors: Array<{ source: string; message: string }>;
  savedSearchIds: Set<string>;
  onSearch: (params: JobSearchParams) => Promise<void>;
  onLoadMore: () => Promise<void>;
  onSaveAsOpportunity: (job: UnifiedJobResult) => void;
}

const OpportunitiesJobSearchSection: React.FC<OpportunitiesJobSearchSectionProps> = ({
  isSearching,
  searchResults,
  searchError,
  searchTotal,
  searchHasMore,
  searchErrors,
  savedSearchIds,
  onSearch,
  onLoadMore,
  onSaveAsOpportunity,
}) => {
  const { t } = useTranslation();
  return (
    <div className='mb-8'>
      <div className='mb-3'>
        <h2 className='text-xl font-semibold text-foreground'>
          {t('opportunities.jobSearch.title')}
        </h2>
        <p className='text-sm text-muted-foreground mt-1'>
          {t('opportunities.jobSearch.subtitle')}
        </p>
      </div>
      <JobSearchForm
        onSearch={onSearch}
        isSearching={isSearching}
      />
      <JobSearchResults
        results={searchResults}
        isLoading={isSearching}
        error={searchError}
        totalCount={searchTotal}
        hasMore={searchHasMore}
        onLoadMore={onLoadMore}
        onSaveAsOpportunity={onSaveAsOpportunity}
        savedIds={savedSearchIds}
        errors={searchErrors}
      />
    </div>
  );
};

function useOpportunitiesManager() {
  const { t } = useTranslation();
  const { showSuccess, showError } = useAlert();

  const opportunities = useOpportunitiesStore((state) => state.opportunities);
  const loadOpportunities = useOpportunitiesStore((state) => state.loadOpportunities);
  const addOpportunity = useOpportunitiesStore((state) => state.addOpportunity);
  const deleteOpportunity = useOpportunitiesStore((state) => state.deleteOpportunity);
  const refreshOpportunities = useOpportunitiesStore((state) => state.refreshOpportunities);
  const addApplication = useApplicationsStore((state) => state.addApplication);

  const [state, dispatch] = useReducer(opportunitiesPageReducer, {
    searchTerm: '',
    isFormOpen: false,
    searchResults: [],
    isSearching: false,
    searchError: null,
    searchTotal: 0,
    searchHasMore: false,
    searchErrors: [],
    savedSearchIds: new Set<string>(),
    deleteConfirm: { isOpen: false, opportunity: null },
  });

  const { searchTerm, isFormOpen, searchResults, isSearching, searchError, searchTotal, searchHasMore, searchErrors, savedSearchIds, deleteConfirm } = state;
  const searchParamsRef = useRef<JobSearchParams | null>(null);

  useEffect(() => {
    loadOpportunities();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'jobOpportunities' || e.key === null) {
        refreshOpportunities();
      }
    };

    const handleOpportunitiesUpdate = () => {
      refreshOpportunities();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('jobOpportunitiesUpdated', handleOpportunitiesUpdate as EventListener);

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
      const application = convertOpportunityToApplication(opportunity);

      addApplication(application);

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
    dispatch({ type: 'SET_DELETE_CONFIRM', value: { isOpen: true, opportunity } });
  };

  const confirmDelete = () => {
    if (deleteConfirm.opportunity) {
      const opportunity = deleteConfirm.opportunity;
      deleteOpportunity(opportunity.id);

      try {
        window.postMessage({
          type: 'DELETE_OPPORTUNITY',
          opportunityId: opportunity.id,
        }, window.location.origin);
      } catch (error) {
        console.error('Error sending delete message to extension:', error);
      }

      showSuccess(t('opportunities.success.deleted', { position: opportunity.position }));
      dispatch({ type: 'SET_DELETE_CONFIRM', value: { isOpen: false, opportunity: null } });
    }
  };

  const handleAddOpportunity = useCallback((opportunityData: Omit<JobOpportunity, 'id' | 'capturedDate'>) => {
    try {
      const newOpportunity = addOpportunity(opportunityData);
      showSuccess(t('opportunities.success.added', { position: opportunityData.position, company: opportunityData.company }));

      try {
        window.postMessage({
          type: 'SYNC_OPPORTUNITY',
          data: newOpportunity,
        }, window.location.origin);
      } catch (error) {
        console.debug('Extension not available for sync:', error);
      }
    } catch (error) {
      console.error('Error adding opportunity:', error);
      showError(t('opportunities.success.addError'));
    }
  }, [addOpportunity, showSuccess, showError, t]);

  const handleJobSearch = useCallback(async (params: JobSearchParams) => {
    dispatch({ type: 'SET_IS_SEARCHING', value: true });
    dispatch({ type: 'SET_SEARCH_ERROR', value: null });
    dispatch({ type: 'SET_SEARCH_RESULTS', value: [] });
    dispatch({ type: 'SET_SEARCH_ERRORS', value: [] });
    searchParamsRef.current = params;
    dispatch({ type: 'SET_SEARCH_TOTAL', value: 0 });
    dispatch({ type: 'SET_SEARCH_HAS_MORE', value: false });

    try {
      const response = await searchJobs(params);
      dispatch({ type: 'SET_SEARCH_RESULTS', value: response.results });
      dispatch({ type: 'SET_SEARCH_TOTAL', value: response.total });
      dispatch({ type: 'SET_SEARCH_HAS_MORE', value: response.hasMore });
      if (response.errors?.length) {
        dispatch({ type: 'SET_SEARCH_ERRORS', value: response.errors });
      }
    } catch (err) {
      const error = err as { message?: string };
      dispatch({ type: 'SET_SEARCH_ERROR', value: error.message ?? 'Search failed. Please try again.' });
    } finally {
      dispatch({ type: 'SET_IS_SEARCHING', value: false });
    }
  }, []);

  const handleLoadMore = useCallback(async () => {
    const searchParams = searchParamsRef.current;
    if (!searchParams || isSearching) return;

    dispatch({ type: 'SET_IS_SEARCHING', value: true });
    dispatch({ type: 'SET_SEARCH_ERROR', value: null });

    try {
      const nextParams = { ...searchParams, page: searchParams.page + 1 };
      searchParamsRef.current = nextParams;
      const response = await searchJobs(nextParams);
      dispatch({ type: 'APPEND_SEARCH_RESULTS', value: response.results });
      dispatch({ type: 'SET_SEARCH_TOTAL', value: response.total });
      dispatch({ type: 'SET_SEARCH_HAS_MORE', value: response.hasMore });
      if (response.errors?.length) {
        dispatch({ type: 'APPEND_SEARCH_ERRORS', value: response.errors });
      }
    } catch (err) {
      const error = err as { message?: string };
      dispatch({ type: 'SET_SEARCH_ERROR', value: error.message ?? 'Failed to load more results.' });
    } finally {
      dispatch({ type: 'SET_IS_SEARCHING', value: false });
    }
  }, [isSearching]);

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
    dispatch({ type: 'ADD_SAVED_SEARCH_IDS', value: [job.id] });
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

  const recentCount = useMemo(() => {
    const oneWeekAgo = getTodayDate();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return opportunities.filter(opp => {
      const captured = opp.capturedDate ? parseDateString(opp.capturedDate) : null;
      return captured && captured >= oneWeekAgo;
    }).length;
  }, [opportunities]);

  const remoteCount = useMemo(() => {
    return opportunities.filter(opp =>
      opp.location?.toLowerCase().includes('remote') ||
      opp.jobType?.toLowerCase().includes('remote')
    ).length;
  }, [opportunities]);

  return {
    opportunities,
    searchTerm,
    isFormOpen,
    searchResults,
    isSearching,
    searchError,
    searchTotal,
    searchHasMore,
    searchErrors,
    savedSearchIds,
    deleteConfirm,
    recentCount,
    remoteCount,
    filteredOpportunities,
    setSearchTerm: (value: string) => dispatch({ type: 'SET_SEARCH_TERM', value }),
    openForm: () => dispatch({ type: 'TOGGLE_FORM', value: true }),
    closeForm: () => dispatch({ type: 'TOGGLE_FORM', value: false }),
    confirmDelete,
    closeDeleteConfirm: () => dispatch({ type: 'SET_DELETE_CONFIRM', value: { isOpen: false, opportunity: null } }),
    handleApply,
    handleDelete,
    handleAddOpportunity,
    handleJobSearch,
    handleLoadMore,
    handleSaveAsOpportunity,
  };
}
