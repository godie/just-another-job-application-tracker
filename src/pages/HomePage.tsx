// src/pages/HomePage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import Footer from '../components/Footer';
import ViewSwitcher, { type ViewType } from '../components/ViewSwitcher';
import FiltersBar, { type Filters } from '../components/FiltersBar';
import MetricsSummary from '../components/MetricsSummary';
import { useAlert } from '../components/AlertProvider';
import {
  type JobApplication,
} from '../utils/localStorage';
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
    <div className="max-w-7xl mx-auto">
          
          {/* Summary Section */}
          <MetricsSummary applications={filteredApplications} />

          {/* Google Sheets Sync */}
          <div className="mb-4 flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("csv.title", "Local Data Management")}</h2>
              <CSVActions />
            </div>
          </div>
          <GoogleSheetsSync 
            applications={nonDeletedApplications}
            onSyncComplete={() => {
              // Refresh applications after sync if needed
              refreshApplications();
            }}
          />

          {/* Gmail Scan Link */}
          <div className="mb-6 flex justify-end">
            <button
              onClick={() => onNavigate?.('gmail-scan')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors border border-indigo-100 dark:border-indigo-800"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {t('settings.emailScan.scanGmail')}
            </button>
          </div>

          <div className="space-y-4">
            <FiltersBar
              filters={filters}
              onFiltersChange={handleFiltersChange}
              availableStatuses={availableStatuses}
              availablePlatforms={availablePlatforms}
              onClear={handleClearFilters}
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                <Trans
                  i18nKey="home.showing"
                  values={{ count: filteredApplications.length, total: applications.length }}
                  components={{ bold: <span className="font-semibold text-gray-700 dark:text-gray-300" /> }}
                />
              </p>
            </div>
          </div>
          
          {/* View Switcher, Header and Add Button */}
          <div className="flex flex-col gap-4 mb-6 mt-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:flex-1">
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('home.pipeline')}</h1>
              <ViewSwitcher currentView={currentView} onViewChange={handleViewChange} />
            </div>
            <button 
              className="self-start sm:self-auto bg-green-700 hover:bg-green-800 text-white font-bold py-2.5 px-6 rounded-full shadow-lg transition duration-150 transform hover:scale-[1.02]"
              onClick={handleCreateNew}
              aria-label={t('home.addEntry')}
              data-testid="add-entry-button"
            >
              {t('home.addEntry')}
            </button>
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
            initialData={currentApplication} // Pasar datos para prellenar
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
