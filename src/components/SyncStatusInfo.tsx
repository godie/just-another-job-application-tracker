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
    return <p className="text-sm text-muted-foreground">{t('sheets.createSheetDesc')}</p>;
  }

  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">
        <span className="font-medium">{t('sheets.status')}:</span>{' '}
        {syncStatus.lastSyncError ? (
          <span className="text-red-600 dark:text-red-300">{t('common.status')}: {syncStatus.lastSyncError}</span>
        ) : syncStatus.lastSyncTime ? (
          <span className="text-green-600 dark:text-green-300">{t('sheets.synced', { time: formatLastSyncTime(syncStatus.lastSyncTime) })}</span>
        ) : (
          <span className="text-muted-foreground">{t('sheets.notSynced')}</span>
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
            className="text-sm text-muted-foreground hover:text-foreground underline"
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
