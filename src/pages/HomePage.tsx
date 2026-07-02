import React, { useReducer, useEffect, useCallback, useEffectEvent } from 'react';
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

interface HomePageState {
  currentApplication: JobApplication | null;
  selectedJobId: string | null;
  currentView: ViewType;
  filters: Filters;
  isDataToolsOpen: boolean;
}

type HomePageAction =
  | { type: 'SET_CURRENT_APPLICATION'; value: JobApplication | null }
  | { type: 'SET_SELECTED_JOB_ID'; value: string | null }
  | { type: 'SET_CURRENT_VIEW'; value: ViewType }
  | { type: 'SET_FILTERS'; value: Filters }
  | { type: 'TOGGLE_DATA_TOOLS' };

function homePageReducer(state: HomePageState, action: HomePageAction): HomePageState {
  switch (action.type) {
    case 'SET_CURRENT_APPLICATION':
      return { ...state, currentApplication: action.value };
    case 'SET_SELECTED_JOB_ID':
      return { ...state, selectedJobId: action.value };
    case 'SET_CURRENT_VIEW':
      return { ...state, currentView: action.value };
    case 'SET_FILTERS':
      return { ...state, filters: action.value };
    case 'TOGGLE_DATA_TOOLS':
      return { ...state, isDataToolsOpen: !state.isDataToolsOpen };
    default:
      return state;
  }
}

const HomePageContent: React.FC<HomePageContentProps> = ({ onNavigate }) => {
  const { t } = useTranslation();
  const { showSuccess } = useAlert();
  
  useSEO({
    title: t('seo.applications.title'),
    description: t('seo.applications.description'),
  });
  
  const applications = useApplicationsStore((state) => state.applications);
  const addApplication = useApplicationsStore((state) => state.addApplication);
  const updateApplication = useApplicationsStore((state) => state.updateApplication);
  const deleteApplication = useApplicationsStore((state) => state.deleteApplication);
  const refreshApplications = useApplicationsStore((state) => state.refreshApplications);
  const loadApplications = useApplicationsStore((state) => state.loadApplications);
  
  const preferences = usePreferencesStore((state) => state.preferences);
  const loadPreferences = usePreferencesStore((state) => state.loadPreferences);
  
  const [state, dispatch] = useReducer(homePageReducer, {
    currentApplication: null,
    selectedJobId: null,
    currentView: 'table',
    filters: loadInitialFilters(),
    isDataToolsOpen: false,
  });

  const { currentApplication, selectedJobId, currentView, filters, isDataToolsOpen } = state;
  const isFormOpen = currentApplication !== null;
  const isPreviewOpen = selectedJobId !== null;

  const onMessage = useEffectEvent((event: MessageEvent) => {
    if (event.data && event.data.type === 'JOB_OPPORTUNITY_SYNC') {
      showSuccess(t('home.success.captured'));
    }
  });

  const onMount = useEffectEvent(() => {
    loadApplications();
    loadPreferences();
  });

  useEffect(() => {
    onMount();
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (preferences?.defaultView) {
      dispatch({ type: 'SET_CURRENT_VIEW', value: preferences.defaultView });
      window.localStorage.setItem(VIEW_STORAGE_KEY, preferences.defaultView);
    } else {
      const storedView = window.localStorage.getItem(VIEW_STORAGE_KEY) as ViewType | null;
      if (storedView) {
        dispatch({ type: 'SET_CURRENT_VIEW', value: storedView });
      }
    }
  }, [preferences?.defaultView]);
  
  const handleViewChange = useCallback((view: ViewType) => {
    dispatch({ type: 'SET_CURRENT_VIEW', value: view });
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(VIEW_STORAGE_KEY, view);
    }
  }, []);

  const handleFiltersChange = useCallback((nextFilters: Filters) => {
    dispatch({ type: 'SET_FILTERS', value: nextFilters });
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(nextFilters));
    }
  }, []);

  const handleClearFilters = useCallback(() => {
    dispatch({ type: 'SET_FILTERS', value: defaultFilters });
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(FILTERS_STORAGE_KEY);
    }
  }, []);

  const handleSaveEntry = useCallback((entryData: Omit<JobApplication, 'id'> | JobApplication) => {
    if ('id' in entryData) {
      updateApplication(entryData.id, entryData);
    } else {
      addApplication(entryData);
    }
    dispatch({ type: 'SET_CURRENT_APPLICATION', value: null });
  }, [addApplication, updateApplication]);

  const handleDeleteEntry = useCallback((appToDelete: JobApplication) => {
    deleteApplication(appToDelete.id);
    
    showSuccess(t('home.success.deleted', { position: appToDelete.position, company: appToDelete.company }));
  }, [deleteApplication, showSuccess, t]);

  const handleEdit = useCallback((appToEdit: JobApplication | null) => {
    dispatch({ type: 'SET_CURRENT_APPLICATION', value: appToEdit });
  }, []);

  const handleSelectJob = useCallback((app: JobApplication) => {
    dispatch({ type: 'SET_SELECTED_JOB_ID', value: app.id });
  }, []);

  const handleClosePreview = useCallback(() => {
    dispatch({ type: 'SET_SELECTED_JOB_ID', value: null });
  }, []);

  const handleCreateNew = () => {
    dispatch({ type: 'SET_CURRENT_APPLICATION', value: {} as JobApplication });
  }
  const handleCancel = () => {
    dispatch({ type: 'SET_CURRENT_APPLICATION', value: null });
  }

  const {
    filteredApplications,
    availableStatuses,
    availablePlatforms,
    nonDeletedApplications
  } = useFilteredApplications(applications, filters);

  const tableColumns = useTableColumns(preferences);

  return (
    <div className='max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 py-8'>
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
      <div className='mb-10'>
        <button
          type='button'
          onClick={() => dispatch({ type: 'TOGGLE_DATA_TOOLS' })}
          className='flex items-center gap-2 text-xs font-medium tracking-wider uppercase text-muted-foreground hover:text-foreground transition-colors mb-3'
          aria-expanded={isDataToolsOpen}
        >
          <svg
            className={`size-3.5 transform transition-transform duration-200 ${isDataToolsOpen ? 'rotate-90' : ''}`}
            fill='none' viewBox='0 0 24 24' stroke='currentColor'
          >
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
          </svg>
          <span>{t('csv.title', 'Data Management')}</span>
        </button>

        {isDataToolsOpen && (
          <div className='space-y-4 pl-4 border-l border-border dark:border-border'>
            <div className='flex flex-col sm:flex-row sm:items-center gap-4 bg-muted/50 p-4 rounded-lg border border-border dark:border-border'>
              <CSVActions />
              <button
                type='button'
                onClick={() => onNavigate?.('gmail-scan')}
                className='flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/5 dark:bg-primary/10 rounded-lg hover:bg-primary/10 dark:hover:bg-primary/10 transition-colors border border-primary/20 dark:border-primary'
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
      <div className='space-y-3 mb-8'>
        <FiltersBar
          filters={filters}
          onFiltersChange={handleFiltersChange}
          availableStatuses={availableStatuses}
          availablePlatforms={availablePlatforms}
          onClear={handleClearFilters}
        />
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
          <p className='text-sm text-muted-foreground'>
            <Trans
              i18nKey='home.showing'
              values={{ count: filteredApplications.length, total: applications.length }}
              components={{ bold: <span className='font-semibold text-foreground' /> }}
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
