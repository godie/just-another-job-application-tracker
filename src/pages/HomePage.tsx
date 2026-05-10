// src/pages/HomePage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { useSEO } from '../seo';
import Footer from '../components/Footer';
import ViewSwitcher, { type ViewType } from '../components/ViewSwitcher';
import FiltersBar, { type Filters } from '../components/FiltersBar';
import MetricsSummary from '../components/MetricsSummary';
import { useAlert } from '../components/AlertProvider';
import type { JobApplication } from '../types/applications';
import AddJobForm from '../components/AddJobForm';
import CSVActions from '../components/CSVActions';
import GoogleSheetsSync from '../components/GoogleSheetsSync';
import packageJson from '../../package.json';
import { useApplicationsStore } from '../stores/applicationsStore';
import { usePreferencesStore } from '../stores/preferencesStore';
import { useFilteredApplications } from '../hooks/useFilteredApplications';
import { useTableColumns } from '../hooks/useTableColumns';
import CurrentViewRenderer from '../components/CurrentViewRenderer';

const VIEW_STORAGE_KEY = 'preferredView';
const FILTERS_STORAGE_KEY = 'applicationFilters';

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
  const [currentView, setCurrentView] = useState<ViewType>('table');
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [isDataToolsOpen, setIsDataToolsOpen] = useState(false);
  const isFormOpen = currentApplication !== null;

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
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [loadApplications, loadPreferences, showSuccess, t]);

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
  
  // Load filters from localStorage only on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedFilters = window.localStorage.getItem(FILTERS_STORAGE_KEY);
    if (storedFilters) {
      try {
        const parsed = JSON.parse(storedFilters) as Filters;
        setFilters({ ...defaultFilters, ...parsed });
      } catch {
        // ignore JSON parse errors
      }
    }
  }, []);

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
    <div className='max-w-7xl mx-auto px-6 lg:px-8 py-8'>
      {/* ── HERO ZONE ── Header + Add Job CTA + Metrics ── */}
      <header className='mb-10'>
        <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6'>
          <div className='flex-1'>
            <div className='flex items-center gap-3 mb-4'>
              <div className='w-10 h-0.5 bg-sage-500'></div>
              <span className='text-sage-600 dark:text-sage-400 text-sm font-medium tracking-wider uppercase'>
                Dashboard
              </span>
            </div>
            <h1 className='font-serif text-4xl md:text-5xl font-semibold text-earth-900 dark:text-earth-50'>
              {t('home.pipeline')}
            </h1>
            <p className='mt-3 text-base text-earth-600 dark:text-earth-300'>
              Manage your job applications and track your progress
            </p>
          </div>
          <button 
            className='self-start sm:self-auto bg-terracotta-600 hover:bg-terracotta-700 active:bg-terracotta-800 text-white font-bold py-4 px-8 rounded transition-colors border border-terracotta-700 hover:border-terracotta-800 text-base shadow-sm hover:shadow-md'
            onClick={handleCreateNew}
            aria-label={t('home.addEntry')}
            data-testid='add-entry-button'
          >
            + {t('home.addEntry')}
          </button>
        </div>
      </header>
          
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
