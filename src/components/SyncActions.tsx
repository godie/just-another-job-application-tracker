import React from 'react';
import { useTranslation } from 'react-i18next';

export type SyncActionStatus = 'idle' | 'loading' | 'creating' | 'syncing';

interface SyncActionsProps {
  hasSpreadsheet: boolean;
  status: SyncActionStatus;
  onCreateSheet: () => void;
  onSelectExisting: () => void;
  onSync: () => void;
}

const SyncActions: React.FC<SyncActionsProps> = ({
  hasSpreadsheet,
  status,
  onCreateSheet,
  onSelectExisting,
  onSync,
}) => {
  const { t } = useTranslation();
  const isLoading = status !== 'idle';

  return (
    <div className="flex gap-2">
      {!hasSpreadsheet ? (
        <>
          <button
            onClick={onCreateSheet}
            disabled={isLoading}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              isLoading
                ? 'bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground cursor-not-allowed'
                : 'bg-primary hover:bg-primary text-white'
            }`}
            type="button"
          >
            {status === 'creating' ? t('sheets.creating') : t('sheets.createSheet')}
          </button>
          <button
            onClick={onSelectExisting}
            disabled={isLoading}
            className={`px-4 py-2 rounded font-medium transition-colors border ${
              isLoading
                ? 'bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground cursor-not-allowed border-border'
                : 'bg-card hover:bg-muted text-foreground border-border'
            }`}
            type="button"
          >
            {t('sheets.selectExisting')}
          </button>
        </>
      ) : (
        <button
          onClick={onSync}
          disabled={isLoading}
          className={`px-4 py-2 rounded font-medium transition-colors ${
            isLoading
              ? 'bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground cursor-not-allowed'
              : 'bg-primary hover:bg-primary text-white'
          }`}
          type="button"
        >
          {status === 'syncing' ? t('sheets.syncing') : t('sheets.syncNow')}
        </button>
      )}
    </div>
  );
};

export default SyncActions;
