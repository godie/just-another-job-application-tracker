// src/components/settings/ToolsSettings.tsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApplicationsStore } from '../../stores/applicationsStore';
import { useOpportunitiesStore } from '../../stores/opportunitiesStore';
import { useAlert } from '../AlertProvider';
import CSVActions from '../CSVActions';
import { getCurrentISOString, getCurrentDateKey } from '../../utils/dateHelpers';

const ToolsSettings: React.FC = () => {
  const { t } = useTranslation();
  const { showSuccess, showError } = useAlert();
  const setApplications = useApplicationsStore((state) => state.setApplications);
  const setOpportunities = useOpportunitiesStore((state) => state.setOpportunities);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleExportData = () => {
    try {
      const apps = useApplicationsStore.getState().applications;
      const opps = useOpportunitiesStore.getState().opportunities;
      const data = { applications: apps, opportunities: opps, exportDate: getCurrentISOString() };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jat-backup-${getCurrentDateKey()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showSuccess(t('tools.exportSuccess'));
    } catch {
      showError(t('tools.exportError'));
    }
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.applications) {
          setApplications(data.applications);
        }
        if (data.opportunities) {
          setOpportunities(data.opportunities);
        }
        showSuccess(t('tools.importSuccess'));
      } catch {
        showError(t('tools.importError'));
      } finally {
        setIsRestoring(false);
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be re-imported
    e.target.value = '';
  };

  const handleClearData = () => {
    if (window.confirm(t('tools.clearConfirm'))) {
      setApplications([]);
      setOpportunities([]);
      showSuccess(t('tools.clearSuccess'));
    }
  };

  const handleDebugInfo = () => {
    const apps = useApplicationsStore.getState().applications;
    const opps = useOpportunitiesStore.getState().opportunities;
    const info = {
      applicationsCount: apps.length,
      opportunitiesCount: opps.length,
      localStorage: {
        jobApplications: localStorage.getItem('jobApplications')?.length ?? 0,
        jobOpportunities: localStorage.getItem('jobOpportunities')?.length ?? 0,
        preferences: localStorage.getItem('userPreferences')?.length ?? 0,
      },
      userAgent: navigator.userAgent,
      timestamp: getCurrentISOString(),
    };
    console.log('Debug Info:', info);
    alert(JSON.stringify(info, null, 2));
  };

  return (
    <div className='space-y-8'>
      {/* CSV Actions */}
      <div>
        <h3 className='font-serif text-lg font-semibold text-earth-900 dark:text-earth-100 mb-4'>
          {t('tools.csv.heading')}
        </h3>
        <CSVActions />
      </div>

      {/* Backup & Restore */}
      <div>
        <h3 className='font-serif text-lg font-semibold text-earth-900 dark:text-earth-100 mb-4'>
          {t('tools.backup.title')}
        </h3>
        <div className='flex flex-col sm:flex-row gap-4'>
          <button
            onClick={handleExportData}
            className='px-6 py-3 bg-sage-600 hover:bg-sage-700 text-white text-sm font-semibold transition-colors rounded'
            type='button'
          >
            {t('tools.backup.exportJson')}
          </button>
          <label
            className={`px-6 py-3 text-sm font-semibold transition-colors rounded cursor-pointer inline-flex items-center justify-center ${
              isRestoring
                ? 'bg-earth-200 text-earth-400 dark:bg-earth-700 dark:text-earth-500 cursor-not-allowed'
                : 'bg-white dark:bg-earth-800 hover:bg-earth-50 dark:hover:bg-earth-700 text-earth-700 dark:text-earth-300 border border-earth-300 dark:border-earth-600'
            }`}
          >
            {isRestoring ? t('tools.backup.importing') : t('tools.backup.importJson')}
            <input
              type='file'
              accept='.json'
              onChange={handleImportData}
              disabled={isRestoring}
              className='hidden'
              aria-label={t('tools.backup.importJson')}
            />
          </label>
        </div>
      </div>

      {/* Danger Zone */}
      <div>
        <h3 className='font-serif text-lg font-semibold text-terracotta-700 dark:text-terracotta-300 mb-4'>
          {t('tools.danger.title')}
        </h3>
        <div className='bg-terracotta-50 dark:bg-terracotta-900/20 border border-terracotta-200 dark:border-terracotta-700 rounded-lg p-6'>
          <p className='text-sm text-terracotta-600 dark:text-terracotta-400 mb-4'>
            {t('tools.danger.warning')}
          </p>
          <div className='flex flex-col sm:flex-row gap-4'>
            <button
              onClick={handleClearData}
              className='px-6 py-3 bg-terracotta-600 hover:bg-terracotta-700 text-white text-sm font-semibold transition-colors rounded'
              type='button'
            >
              {t('tools.danger.clear')}
            </button>
            <button
              onClick={handleDebugInfo}
              className='px-6 py-3 text-sm font-semibold text-earth-600 dark:text-earth-400 border border-earth-300 dark:border-earth-600 hover:bg-earth-50 dark:hover:bg-earth-700 transition-colors rounded'
              type='button'
            >
              {t('tools.debug.showInfo')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

ToolsSettings.displayName = 'ToolsSettings';

export default ToolsSettings;
