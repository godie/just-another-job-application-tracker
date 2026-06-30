import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useApplicationsStore } from '../stores/applicationsStore';
import { exportToCSV, parseCSV } from '../utils/csv';
import { getCurrentDateKey } from '../utils/dateHelpers';
import { useAlert } from './AlertProvider';
import { HiDownload, HiUpload } from 'react-icons/hi';
import { Button } from './ui/Button';

const CSVActions: React.FC = () => {
  const { t } = useTranslation();
  const { showSuccess, showError } = useAlert();
  const applications = useApplicationsStore((state) => state.applications);
  const setApplications = useApplicationsStore((state) => state.setApplications);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    if (applications.length === 0) {
      showError(t('csv.noData'));
      return;
    }

    const csvContent = exportToCSV(applications);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `jajat_applications_${getCurrentDateKey()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess(t('csv.exportSuccess'));
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const importedApps = parseCSV(text);

        if (importedApps.length > 0) {
          const existingIds = new Set(applications.map(app => app.id));
          const uniqueNewApps = importedApps.filter(app => !existingIds.has(app.id));

          if (uniqueNewApps.length > 0) {
            setApplications([...applications, ...uniqueNewApps]);
            showSuccess(t('csv.importSuccess', { count: uniqueNewApps.length }));
          } else {
            showSuccess(t('csv.importSuccess', { count: 0 }));
          }
        }
      } catch (error) {
        console.error('Error importing CSV:', error);
        showError(t('csv.importError'));
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Button
        type="button"
        variant="outline"
        size="md"
        onClick={handleExport}
        title={t('csv.export')}
      >
        <HiDownload className="size-4" />
        <span className="hidden sm:inline">{t('csv.export')}</span>
      </Button>

      <Button
        type="button"
        variant="outline"
        size="md"
        onClick={handleImportClick}
        title={t('csv.import')}
      >
        <HiUpload className="size-4" />
        <span className="hidden sm:inline">{t('csv.import')}</span>
      </Button>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv"
        className="hidden"
        aria-label={t('csv.import')}
      />
    </div>
  );
};

export default CSVActions;
