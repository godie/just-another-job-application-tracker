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
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
            type="button"
          >
            {isCreatingSheet ? t('sheets.creating') : t('sheets.createSheet')}
          </button>
          <button
            onClick={onSelectExisting}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg font-medium transition-colors border ${
              isLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed border-gray-300'
                : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
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
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            isLoading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
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
