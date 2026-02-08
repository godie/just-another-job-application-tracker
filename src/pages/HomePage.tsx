// src/pages/HomePage.tsx
import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import Footer from '../components/Footer';
import ApplicationTable from '../components/ApplicationTable';
import TimelineView from '../components/TimelineView';
import KanbanView from '../components/KanbanView';
import CalendarView from '../components/CalendarView';
import ViewSwitcher, { type ViewType } from '../components/ViewSwitcher';
import FiltersBar, { type Filters } from '../components/FiltersBar';
import { useAlert } from '../components/AlertProvider';
import {
  DEFAULT_FIELDS,
  type JobApplication,
} from '../utils/localStorage';
import type { TableColumn } from '../types/table';
import AddJobForm from '../components/AddJobComponent';
import GoogleSheetsSync from '../components/GoogleSheetsSync';
import packageJson from '../../package.json';
import { parseLocalDate } from '../utils/date';
import { useApplicationsStore } from '../stores/applicationsStore';
import { usePreferencesStore } from '../stores/preferencesStore';

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

// Componente Placeholder para la sección de métricas
// Memoized to prevent re-renders when filteredApplications reference changes but content is the same
const MetricsSummary: React.FC<{ applications: JobApplication[] }> = ({ applications }) => {
  const { t } = useTranslation();
  // ⚡ Bolt: Separated stat calculation from metric array creation.
  // By memoizing the aggregated stats object first, we can use its primitive
  // values (interviews, offers) as dependencies for the final metrics array.
  // This prevents the metrics array from being recalculated when the
  // `applications` array reference changes but the actual numbers haven't,
  // making the memoization more precise and effective.
  const stats = useMemo(() => {
    return applications.reduce(
      (acc, app) => {
        if (app.interviewDate) {
          acc.interviews++;
        }
        if (app.status === 'Offer') {
          acc.offers++;
        }
        return acc;
      },
      { interviews: 0, offers: 0 }
    );
  }, [applications]);

  const metrics = useMemo(() => {
    return [
      { label: t('home.metrics.applications'), value: applications.length, color: 'border-blue-500' },
      { label: t('home.metrics.interviews'), value: stats.interviews, color: 'border-yellow-500' },
      { label: t('home.metrics.offers'), value: stats.offers, color: 'border-green-500' },
    ];
  }, [applications.length, stats.interviews, stats.offers, t]);

  return (
    <section className="grid grid-cols-3 gap-2 sm:gap-4 my-8" data-testid="metrics-summary">
      {metrics.map((metric) => (
        <div 
          key={metric.label} 
          className={`bg-white dark:bg-gray-800 p-2 sm:p-6 rounded-lg sm:rounded-xl shadow sm:shadow-lg border-l-4 ${metric.color} transition duration-300 hover:shadow-lg sm:hover:shadow-xl`}
        >
          <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">{metric.label}</p>
          <p className="mt-0.5 sm:mt-1 text-xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">{metric.value}</p>
        </div>
      ))}
    </section>
  );
};

MetricsSummary.displayName = 'MetricsSummary';

// Export memoized version
const MemoizedMetricsSummary = memo(MetricsSummary);

import { type PageType } from '../App';

interface HomePageContentProps {
  onNavigate?: (page: PageType) => void;
}

/**
 * Interface for applications with pre-calculated metadata for performance optimization.
 * ⚡ Bolt: Using a specialized interface helps optimize filtering and searching.
 */
interface ApplicationWithMetadata extends JobApplication {
  parsedApplicationDate: Date | null;
  searchMetadata: string;
}

const HomePageContent: React.FC<HomePageContentProps> = () => {
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
        // Refresh applications count in header will be handled automatically
        showSuccess(t('home.success.captured'));
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [loadApplications, loadPreferences, showSuccess, t]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Use default view from preferences, fallback to localStorage for backward compatibility
      if (preferences?.defaultView) {
        setCurrentView(preferences.defaultView);
        // Also update localStorage for backward compatibility
        window.localStorage.setItem(VIEW_STORAGE_KEY, preferences.defaultView);
      } else {
        const storedView = window.localStorage.getItem(VIEW_STORAGE_KEY) as ViewType | null;
        if (storedView) {
          setCurrentView(storedView);
        }
      }
      
      const storedFilters = window.localStorage.getItem(FILTERS_STORAGE_KEY);
      if (storedFilters) {
        try {
          const parsed = JSON.parse(storedFilters) as Filters;
          setFilters({ ...defaultFilters, ...parsed });
        } catch {
          // ignore JSON parse errors
        }
      }
    }
  }, [preferences?.defaultView]);
  
  // Update view when preferences change
  useEffect(() => {
    if (preferences?.defaultView) {
      setCurrentView(preferences.defaultView);
      window.localStorage.setItem(VIEW_STORAGE_KEY, preferences.defaultView);
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
    // ⚡ Bolt: By passing the full application object from the child component,
    // we avoid searching the `applications` array here. This allows us to remove
    // `applications` from the useCallback dependency array, stabilizing this
    // function and preventing unnecessary re-renders of child components like
    // ApplicationTable, KanbanView, and TimelineView.
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

  //useKeyboardEscape(handleCancel, isFormOpen);

  // ⚡ Bolt: Fused Loop for Application Processing
  // Instead of multiple separate loops (one for statuses, one for platforms, one for dates,
  // and one for non-deleted apps), we iterate over the `applications` array once.
  // We also pre-calculate a `searchMetadata` string for each application to optimize
  // the filtering process, especially for the search bar.
  const {
    applicationsWithMetadata,
    availableStatuses,
    availablePlatforms,
    nonDeletedApplications
  } = useMemo(() => {
    const statusesSet = new Set<string>();
    const platformsSet = new Set<string>();
    const nonDeleted: JobApplication[] = [];

    const withMetadata: ApplicationWithMetadata[] = applications.map(app => {
      // 1. Collect unique statuses and platforms
      if (app.status) statusesSet.add(app.status);
      if (app.platform) platformsSet.add(app.platform);

      // 2. Identify non-deleted applications
      if (app.status !== 'Deleted') {
        nonDeleted.push(app);
      }

      // 3. Pre-calculate searchable string (Search Metadata)
      // This combines all searchable fields into a single lowercase string
      // to avoid expensive mapping and multiple checks during every filter update.
      const timelineStr = app.timeline?.map(event =>
        `${event.notes ?? ''} ${event.customTypeName ?? ''} ${event.interviewerName ?? ''}`
      ).join(' ') || '';

      const searchMetadata = `${app.position ?? ''} ${app.company ?? ''} ${app.contactName ?? ''} ${app.notes ?? ''} ${timelineStr}`.toLowerCase();

      return {
        ...app,
        parsedApplicationDate: app.applicationDate ? parseLocalDate(app.applicationDate) : null,
        searchMetadata,
      };
    });

    return {
      applicationsWithMetadata: withMetadata,
      availableStatuses: Array.from(statusesSet).sort((a, b) => a.localeCompare(b)),
      availablePlatforms: Array.from(platformsSet).sort((a, b) => a.localeCompare(b)),
      nonDeletedApplications: nonDeleted,
    };
  }, [applications]);

  const filteredApplications = useMemo(() => {
    const normalizedSearch = filters.search.trim().toLowerCase();
    const fromDate = filters.dateFrom ? parseLocalDate(filters.dateFrom) : null;
    const toDate = filters.dateTo ? parseLocalDate(filters.dateTo) : null;

    return applicationsWithMetadata.filter(app => {
      // Exclude deleted applications by default
      if (app.status === 'Deleted') {
        return false;
      }

      // ⚡ Bolt: Optimized Search Check
      // Using pre-calculated searchMetadata avoids expensive string operations
      // and timeline mapping inside the filter loop.
      const matchesSearch = normalizedSearch
        ? app.searchMetadata.includes(normalizedSearch)
        : true;

      // Advanced status filtering with include/exclude
      let matchesStatus = true;
      const statusInclude = filters.statusInclude || [];
      const statusExclude = filters.statusExclude || [];
      
      // If using legacy single status filter
      if (filters.status && statusInclude.length === 0 && statusExclude.length === 0) {
        matchesStatus = app.status === filters.status;
      } else {
        // New advanced filtering
        // If there are included statuses, app must be in that list
        if (statusInclude.length > 0) {
          matchesStatus = statusInclude.includes(app.status);
        }
        // Excluded statuses always take precedence
        if (statusExclude.length > 0 && statusExclude.includes(app.status)) {
          matchesStatus = false;
        }
      }

      const matchesPlatform = filters.platform ? app.platform === filters.platform : true;

      let matchesDateFrom = true;
      let matchesDateTo = true;

      if (fromDate) {
        matchesDateFrom = app.parsedApplicationDate ? app.parsedApplicationDate >= fromDate : false;
      }

      if (toDate) {
        matchesDateTo = app.parsedApplicationDate ? app.parsedApplicationDate <= toDate : false;
      }

      return matchesSearch && matchesStatus && matchesPlatform && matchesDateFrom && matchesDateTo;
    });
  }, [applicationsWithMetadata, filters]);

  const tableColumns: TableColumn[] = useMemo(() => {
    const buildColumn = (id: string, fallbackLabel: string): TableColumn => ({
      id,
      label: t(`fields.${id}`, fallbackLabel),
    });

    if (!preferences) {
      return DEFAULT_FIELDS.map((field) => buildColumn(field.id, field.label));
    }

    const enabledSet = new Set(preferences.enabledFields);

    const fieldById = new Map<string, TableColumn>();
    DEFAULT_FIELDS.forEach((field) => {
      fieldById.set(field.id, buildColumn(field.id, field.label));
    });
    preferences.customFields.forEach((field) => {
      fieldById.set(field.id, { id: field.id, label: field.label });
    });

    return preferences.columnOrder
      .filter((id) => enabledSet.has(id))
      .map((id) => fieldById.get(id))
      .filter((column): column is TableColumn => Boolean(column));
  }, [preferences, t]);

  const renderCurrentView = () => {
    switch (currentView) {
      case 'timeline':
        return (
          <TimelineView
            applications={filteredApplications}
            onEdit={handleEdit}
            onDelete={handleDeleteEntry}
          />
        );
      case 'kanban':
        return (
          <KanbanView
            applications={filteredApplications}
            onEdit={handleEdit}
            onDelete={handleDeleteEntry}
          />
        );
      case 'calendar':
        return (
          <CalendarView
            applications={filteredApplications}
            onEdit={handleEdit}
          />
        );
      case 'table':
      default:
        return (
          <ApplicationTable
            columns={tableColumns} 
            data={filteredApplications}
            onEdit={handleEdit}
            onDelete={handleDeleteEntry} />
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
          
          {/* Summary Section */}
          <MemoizedMetricsSummary applications={filteredApplications} />

          {/* Google Sheets Sync */}
          <GoogleSheetsSync 
            applications={nonDeletedApplications}
            onSyncComplete={() => {
              // Refresh applications after sync if needed
              refreshApplications();
            }}
          />

          <div className="space-y-4">
            <FiltersBar
              filters={filters}
              onFiltersChange={handleFiltersChange}
              availableStatuses={availableStatuses}
              availablePlatforms={availablePlatforms}
              onClear={handleClearFilters}
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
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
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{t('home.pipeline')}</h2>
              <ViewSwitcher currentView={currentView} onViewChange={handleViewChange} />
            </div>
            <button 
              className="self-start sm:self-auto bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-6 rounded-full shadow-lg transition duration-150 transform hover:scale-[1.02]"
              onClick={handleCreateNew}
              aria-label={t('home.addEntry')}
              data-testid="add-entry-button"
            >
              {t('home.addEntry')}
            </button>
          </div>
          
          {/* Current View */}
          {renderCurrentView()}
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
