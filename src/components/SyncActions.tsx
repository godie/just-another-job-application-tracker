import React from 'react';
import { useTranslation } from 'react-i18next';

interface SyncActionsProps {
  hasSpreadsheet: boolean;
  isLoading: boolean;
  isCreatingSheet: boolean;
  isSyncing: boolean;
  onCreateSheet: () => void;
  onSelectExisting: () => void;
  onSync: () => void;
}

const SyncActions: React.FC<SyncActionsProps> = ({
  hasSpreadsheet,
  isLoading,
  isCreatingSheet,
  isSyncing,
  onCreateSheet,
  onSelectExisting,
  onSync,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex gap-2">
      {!hasSpreadsheet ? (
        <>
          <button
            onClick={onCreateSheet}
            disabled={isLoading}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              isLoading
                ? 'bg-earth-200 text-earth-400 dark:bg-earth-700 dark:text-earth-500 cursor-not-allowed'
                : 'bg-sage-600 hover:bg-sage-700 text-white'
            }`}
            type="button"
          >
            {isCreatingSheet ? t('sheets.creating') : t('sheets.createSheet')}
          </button>
          <button
            onClick={onSelectExisting}
            disabled={isLoading}
            className={`px-4 py-2 rounded font-medium transition-colors border ${
              isLoading
                ? 'bg-earth-100 text-earth-400 dark:bg-earth-700 dark:text-earth-500 cursor-not-allowed border-earth-200 dark:border-earth-600'
                : 'bg-white dark:bg-earth-800 hover:bg-earth-50 dark:hover:bg-earth-700 text-earth-700 dark:text-earth-200 border-earth-300 dark:border-earth-600'
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
              ? 'bg-earth-200 text-earth-400 dark:bg-earth-700 dark:text-earth-500 cursor-not-allowed'
              : 'bg-sage-600 hover:bg-sage-700 text-white'
          }`}
          type="button"
        >
          {isSyncing ? t('sheets.syncing') : t('sheets.syncNow')}
        </button>
      )}
    </div>
  );
};

export default SyncActions;
