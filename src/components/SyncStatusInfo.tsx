import React from 'react';
import { useTranslation } from 'react-i18next';
import { type SyncStatus, formatLastSyncTime } from '../utils/googleSheets';

interface SyncStatusInfoProps {
  hasSpreadsheet: boolean;
  syncStatus: SyncStatus;
  spreadsheetUrl: string | null;
  onOpenSheet: () => void;
  onChangeSheet: () => void;
}

const SyncStatusInfo: React.FC<SyncStatusInfoProps> = ({
  hasSpreadsheet,
  syncStatus,
  spreadsheetUrl,
  onOpenSheet,
  onChangeSheet,
}) => {
  const { t } = useTranslation();

  if (!hasSpreadsheet) {
    return <p className="text-sm text-earth-600 dark:text-earth-400">{t('sheets.createSheetDesc')}</p>;
  }

  return (
    <div className="space-y-1">
      <p className="text-sm text-earth-600 dark:text-earth-400">
        <span className="font-medium">{t('sheets.status')}:</span>{' '}
        {syncStatus.lastSyncError ? (
          <span className="text-red-600 dark:text-red-400">{t('common.status')}: {syncStatus.lastSyncError}</span>
        ) : syncStatus.lastSyncTime ? (
          <span className="text-green-600 dark:text-green-400">{t('sheets.synced', { time: formatLastSyncTime(syncStatus.lastSyncTime) })}</span>
        ) : (
          <span className="text-earth-500 dark:text-earth-400">{t('sheets.notSynced')}</span>
        )}
      </p>
      {spreadsheetUrl && (
        <div className="flex gap-3 items-center">
          <button
            onClick={onOpenSheet}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
            type="button"
          >
            {t('sheets.openSheet')}
          </button>
          <button
            onClick={onChangeSheet}
            className="text-sm text-earth-600 dark:text-earth-400 hover:text-earth-800 dark:hover:text-earth-200 underline"
            type="button"
          >
            {t('sheets.changeSheet')}
          </button>
        </div>
      )}
    </div>
  );
};

export default SyncStatusInfo;
