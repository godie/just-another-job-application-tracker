import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApplicationsStore } from '../../stores/applicationsStore';
import { useOpportunitiesStore } from '../../stores/opportunitiesStore';
import { useAlert } from '../AlertProvider';
import CSVActions from '../CSVActions';
import { getCurrentISOString, getCurrentDateKey } from '../../utils/dateHelpers';

function handleDebugInfo(): void {
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
}

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
    e.target.value = '';
  };

  const handleClearData = () => {
    if (window.confirm(t('tools.clearConfirm'))) {
      setApplications([]);
      setOpportunities([]);
      showSuccess(t('tools.clearSuccess'));
    }
  };

  return (
    <div className='space-y-8'>
      {/* CSV Actions */}
      <div>
        <h3 className='font-serif text-lg font-semibold text-foreground mb-4'>
          {t('tools.csv.heading')}
        </h3>
        <CSVActions />
      </div>

      {/* Backup & Restore */}
      <div>
        <h3 className='font-serif text-lg font-semibold text-foreground mb-4'>
          {t('tools.backup.title')}
        </h3>
        <div className='flex flex-col sm:flex-row gap-4'>
          <button
            onClick={handleExportData}
            className='px-6 py-3 bg-primary hover:bg-primary text-white text-sm font-semibold transition-colors rounded'
            type='button'
          >
            {t('tools.backup.exportJson')}
          </button>
          <label
            className={`px-6 py-3 text-sm font-semibold transition-colors rounded cursor-pointer inline-flex items-center justify-center ${
              isRestoring
                ? 'bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground cursor-not-allowed'
                : 'bg-card hover:bg-muted text-muted-foreground border border-border'
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
        <h3 className='font-serif text-lg font-semibold text-destructive mb-4'>
          {t('tools.danger.title')}
        </h3>
        <div className='bg-destructive/5 dark:bg-destructive/10 border border-destructive/30 rounded-lg p-6'>
          <p className='text-sm text-destructive mb-4'>
            {t('tools.danger.warning')}
          </p>
          <div className='flex flex-col sm:flex-row gap-4'>
            <button
              onClick={handleClearData}
              className='px-6 py-3 bg-destructive text-destructive-foreground hover:bg-destructive/90 text-sm font-semibold transition-colors rounded'
              type='button'
            >
              {t('tools.danger.clear')}
            </button>
            <button
              onClick={handleDebugInfo}
              className='px-6 py-3 text-sm font-semibold text-muted-foreground border border-border hover:bg-muted transition-colors rounded'
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
