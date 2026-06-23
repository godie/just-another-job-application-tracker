// src/pages/HomePage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { useSEO } from '../seo/useSEO';
import Footer from '../components/Footer';
import ViewSwitcher, { type ViewType } from '../components/ViewSwitcher';
import FiltersBar, { type Filters } from '../components/FiltersBar';
import MetricsSummary from '../components/MetricsSummary';
import { useAlert } from '../components/AlertProvider';
import type { JobApplication } from '../types/applications';
import AddJobForm from '../components/AddJobForm';
import CSVActions from '../components/CSVActions';
import GoogleSheetsSync from '../components/GoogleSheetsSync';
import JobPreviewPanel from '../components/JobPreviewPanel';
import packageJson from '../../package.json';
import { useApplicationsStore } from '../stores/applicationsStore';
import { usePreferencesStore } from '../stores/preferencesStore';
import { useFilteredApplications } from '../hooks/useFilteredApplications';
import { useTableColumns } from '../hooks/useTableColumns';
import CurrentViewRenderer from '../components/CurrentViewRenderer';
import { PageHeader } from '../components/ui/PageHeader';

const VIEW_STORAGE_KEY = 'preferredView';
const FILTERS_STORAGE_KEY = 'applicationFilters';

// Initialize from localStorage synchronously
function loadInitialFilters(): Filters {
  if (typeof window === 'undefined') return defaultFilters;
  const storedFilters = window.localStorage.getItem(FILTERS_STORAGE_KEY);
  if (storedFilters) {
    try {
      const parsed = JSON.parse(storedFilters) as Filters;
      return { ...defaultFilters, ...parsed };
    } catch {
      return defaultFilters;
    }
  }
  return defaultFilters;
}

const defaultFilters: Filters = {
  search: '',
  status: '',
  statusInclude: [],
  statusExclude: [],
  platform: '',
  dateFrom: '',
  dateTo: '',
};

import { type PageType } from '../App';

interface HomePageContentProps {
  onNavigate?: (page: PageType) => void;
}

const HomePageContent: React.FC<HomePageContentProps> = ({ onNavigate }) => {
  const { t } = useTranslation();
  const { showSuccess } = useAlert();
  
  useSEO({
    title: t('seo.applications.title'),
    description: t('seo.applications.description'),
  });
  
  // Use Zustand stores
  const applications = useApplicationsStore((state) => state.applications);
  const addApplication = useApplicationsStore((state) => state.addApplication);
  const updateApplication = useApplicationsStore((state) => state.updateApplication);
  const deleteApplication = useApplicationsStore((state) => state.deleteApplication);
  const refreshApplications = useApplicationsStore((state) => state.refreshApplications);
  const loadApplications = useApplicationsStore((state) => state.loadApplications);
  
  const preferences = usePreferencesStore((state) => state.preferences);
  const loadPreferences = usePreferencesStore((state) => state.loadPreferences);
  
  const [currentApplication, setCurrentApplication] = useState<JobApplication | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('table');
  const [filters, setFilters] = useState<Filters>(loadInitialFilters);
  const [isDataToolsOpen, setIsDataToolsOpen] = useState(false);
  const isFormOpen = currentApplication !== null;
  const isPreviewOpen = selectedJobId !== null;

  // Load data on mount
  useEffect(() => {
    loadApplications();
    loadPreferences();
    
    // Listen for new opportunities from Chrome extension
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'JOB_OPPORTUNITY_SYNC') {
        // New opportunity added from extension
        showSuccess(t('home.success.captured'));
      }
    };
    
    window.addEventListener('message', handleMessage);

    // Listen for edit requests from JobDetailsPage.
    // Use getState() to read latest applications without subscribing to the store,
    // avoiding an infinite render loop (loadApplications updates applications → effect
    // re-runs → calls loadApplications again).
    const handleTriggerEdit = (e: Event) => {
      const customEvent = e as CustomEvent<{ jobId: string }>;
      if (customEvent.detail?.jobId) {
        const apps = useApplicationsStore.getState().applications;
        const app = apps.find((a) => a.id === customEvent.detail.jobId);
        if (app) {
          setCurrentApplication(app);
        }
      }
    };
    window.addEventListener('triggerEditJob', handleTriggerEdit);
    
    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('triggerEditJob', handleTriggerEdit);
    };
  // loadApplications/loadPreferences are stable Zustand actions.
  // showSuccess (useAlert) and t (useTranslation) are referentially stable.
  // Stable deps = effect runs once on mount; no re-subscription needed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadApplications, loadPreferences]);

  // Sync view preference
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (preferences?.defaultView) {
      setCurrentView(preferences.defaultView);
      window.localStorage.setItem(VIEW_STORAGE_KEY, preferences.defaultView);
    } else {
      const storedView = window.localStorage.getItem(VIEW_STORAGE_KEY) as ViewType | null;
      if (storedView) {
        setCurrentView(storedView);
      }
    }
  }, [preferences?.defaultView]);
  
  const handleViewChange = useCallback((view: ViewType) => {
    setCurrentView(view);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(VIEW_STORAGE_KEY, view);
    }
  }, []);

  const handleFiltersChange = useCallback((nextFilters: Filters) => {
    setFilters(nextFilters);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(nextFilters));
    }
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters(defaultFilters);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(FILTERS_STORAGE_KEY);
    }
  }, []);

  const handleSaveEntry = useCallback((entryData: Omit<JobApplication, 'id'> | JobApplication) => {
    if ('id' in entryData) {
      // Update existing application
      updateApplication(entryData.id, entryData);
    } else {
      // Add new application
      addApplication(entryData);
    }
    setCurrentApplication(null);
  }, [addApplication, updateApplication]);

  const handleDeleteEntry = useCallback((appToDelete: JobApplication) => {
    // Delete using store action
    deleteApplication(appToDelete.id);
    
    // Show success message
    showSuccess(t('home.success.deleted', { position: appToDelete.position, company: appToDelete.company }));
  }, [deleteApplication, showSuccess, t]);

  const handleEdit = useCallback((appToEdit: JobApplication | null) => {
    setCurrentApplication(appToEdit);
  }, []);

  const handleSelectJob = useCallback((app: JobApplication) => {
    setSelectedJobId(app.id);
  }, []);

  const handleClosePreview = useCallback(() => {
    setSelectedJobId(null);
  }, []);

  const handleCreateNew = () => {
    setCurrentApplication({} as JobApplication);
  }
  const handleCancel = () => {
    setCurrentApplication(null);
  }

  const {
    filteredApplications,
    availableStatuses,
    availablePlatforms,
    nonDeletedApplications
  } = useFilteredApplications(applications, filters);

  const tableColumns = useTableColumns(preferences);

  return (
    <div className='max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8'>
      {/* ── HERO ZONE ── Header + Add Job CTA + Metrics ── */}
      <PageHeader
        category="Dashboard"
        title={t('home.pipeline')}
        description="Manage your job applications and track your progress"
        actionLabel={`+ ${t('home.addEntry')}`}
        onAction={handleCreateNew}
        actionTestId="add-entry-button"
      />
          
      <MetricsSummary applications={filteredApplications} />

      {/* ── DATA TOOLS ── Collapsible utilities zone ── */}
      <div className='mb-8'>
        <button
          type='button'
          onClick={() => setIsDataToolsOpen(!isDataToolsOpen)}
          className='flex items-center gap-2 text-sm font-medium text-earth-500 dark:text-earth-400 hover:text-sage-600 dark:hover:text-sage-400 transition-colors mb-3'
          aria-expanded={isDataToolsOpen}
        >
          <svg
            className={`size-4 transform transition-transform ${isDataToolsOpen ? 'rotate-90' : ''}`}
            fill='none' viewBox='0 0 24 24' stroke='currentColor'
          >
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
          </svg>
          <span>{t('csv.title', 'Data Management')}</span>
        </button>

        {isDataToolsOpen && (
          <div className='space-y-4 pl-6 border-l-2 border-earth-200 dark:border-earth-700'>
            <div className='flex flex-col sm:flex-row sm:items-center gap-4 bg-earth-50 dark:bg-earth-800 p-4 rounded border border-earth-200 dark:border-earth-700'>
              <CSVActions />
              <button
                type='button'
                onClick={() => onNavigate?.('gmail-scan')}
                className='flex items-center gap-2 px-4 py-2 text-sm font-medium text-sage-700 dark:text-sage-300 bg-sage-50 dark:bg-sage-900/30 rounded hover:bg-sage-100 dark:hover:bg-sage-900/50 transition-colors border border-sage-200 dark:border-sage-700'
              >
                <svg className='size-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' />
                </svg>
                {t('settings.emailScan.scanGmail')}
              </button>
            </div>
            <GoogleSheetsSync 
              applications={nonDeletedApplications}
              onSyncComplete={() => {
                refreshApplications();
              }}
            />
          </div>
        )}
      </div>

      {/* ── WORK ZONE ── Filters + View Switcher + Table ── */}
      <div className='space-y-4 mb-6'>
        <FiltersBar
          filters={filters}
          onFiltersChange={handleFiltersChange}
          availableStatuses={availableStatuses}
          availablePlatforms={availablePlatforms}
          onClear={handleClearFilters}
        />
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <p className='text-sm text-earth-600 dark:text-earth-400'>
            <Trans
              i18nKey='home.showing'
              values={{ count: filteredApplications.length, total: applications.length }}
              components={{ bold: <span className='font-semibold text-earth-700 dark:text-earth-300' /> }}
            />
          </p>
          <ViewSwitcher currentView={currentView} onViewChange={handleViewChange} />
        </div>
      </div>
          
      {/* Current View */}
      <CurrentViewRenderer
        currentView={currentView}
        filteredApplications={filteredApplications}
        tableColumns={tableColumns}
        onSelectJob={handleSelectJob}
        onEdit={handleEdit}
        onDelete={handleDeleteEntry}
      />
      <Footer version={packageJson.version} />
      {isFormOpen && (
        <AddJobForm 
          initialData={currentApplication}
          onSave={handleSaveEntry}
          onCancel={handleCancel}
        />
      )}
      {isPreviewOpen && selectedJobId && (
        <JobPreviewPanel
          jobId={selectedJobId}
          onClose={handleClosePreview}
          onNavigate={onNavigate}
          onEdit={handleEdit}
          onDelete={handleDeleteEntry}
        />
      )}
    </div>
  );
};

interface HomePageProps {
  onNavigate?: (page: PageType) => void;
}

const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  return <HomePageContent onNavigate={onNavigate} />;
};

export default HomePage;
