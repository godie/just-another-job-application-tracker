// src/components/GoogleSheetsSync.tsx

import React, { useReducer, useEffect, useCallback, useRef } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { useAlert } from './AlertProvider';
import { checkLoginStatus } from '../utils/localStorage';
import {
  createSpreadsheet,
  syncToGoogleSheets,
  getSyncStatus,
  getStoredSpreadsheetId,
  setSpreadsheetId,
  type SyncStatus,
} from '../utils/googleSheets';
import type { JobApplication } from '../utils/localStorage';
import SyncStatusInfo from './SyncStatusInfo';
import SyncActions from './SyncActions';

interface GoogleSheetsSyncProps {
  applications: JobApplication[];
  onSyncComplete?: () => void;
}

interface GoogleSheetsSyncState {
  isLoggedIn: boolean;
  syncStatus: SyncStatus;
  isCreatingSheet: boolean;
  isSyncing: boolean;
  spreadsheetUrl: string | null;
  showSelectSheet: boolean;
  sheetIdInput: string;
  isSettingSheet: boolean;
}

type GoogleSheetsSyncAction =
  | { type: 'SET_FIELD'; field: keyof GoogleSheetsSyncState; value: boolean | string | SyncStatus | null }
  | { type: 'UPDATE_STATUS'; isLoggedIn: boolean; syncStatus: SyncStatus; spreadsheetUrl: string | null };

const googleSheetsSyncReducer = (state: GoogleSheetsSyncState, action: GoogleSheetsSyncAction): GoogleSheetsSyncState => {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'UPDATE_STATUS':
      return {
        ...state,
        isLoggedIn: action.isLoggedIn,
        syncStatus: action.syncStatus,
        spreadsheetUrl: action.spreadsheetUrl,
      };
    default:
      return state;
  }
};

const GoogleSheetsSync: React.FC<GoogleSheetsSyncProps> = ({ applications, onSyncComplete }) => {
  const { t } = useTranslation();
  // ⚡ Bolt: Use ref to store the latest applications without causing re-renders
  const applicationsRef = useRef(applications);
  applicationsRef.current = applications;
  const { showSuccess, showError } = useAlert();

  const [state, dispatch] = useReducer(googleSheetsSyncReducer, undefined, () => ({
    isLoggedIn: false,
    syncStatus: getSyncStatus(),
    isCreatingSheet: false,
    isSyncing: false,
    spreadsheetUrl: null,
    showSelectSheet: false,
    sheetIdInput: '',
    isSettingSheet: false,
  }));

  const {
    isLoggedIn,
    syncStatus,
    isCreatingSheet,
    isSyncing,
    spreadsheetUrl,
    showSelectSheet,
    sheetIdInput,
    isSettingSheet,
  } = state;

  useEffect(() => {
    const updateStatus = () => {
      const loggedIn = checkLoginStatus();
      const status = getSyncStatus();
      const spreadsheetId = getStoredSpreadsheetId();
      const url = spreadsheetId ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}` : null;

      dispatch({
        type: 'UPDATE_STATUS',
        isLoggedIn: loggedIn,
        syncStatus: status,
        spreadsheetUrl: url,
      });
    };

    updateStatus();

    // Listen for storage changes (login/logout)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'isLoggedIn') {
        updateStatus();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically in case localStorage is updated in same window
    const interval = setInterval(updateStatus, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const handleSync = useCallback(async () => {
    // Check login status directly instead of using state to avoid unnecessary recreations
    if (!checkLoginStatus()) {
      showError(t('sheets.loginFirst'));
      return;
    }

    const spreadsheetId = getStoredSpreadsheetId();
    if (!spreadsheetId) {
      showError(t('sheets.noSpreadsheet'));
      return;
    }

    dispatch({ type: 'SET_FIELD', field: 'isSyncing', value: true });
    try {
      // Use ref to get latest applications without dependency on applications prop
      const result = await syncToGoogleSheets(applicationsRef.current, spreadsheetId);
      dispatch({ type: 'SET_FIELD', field: 'syncStatus', value: getSyncStatus() });
      showSuccess(t('sheets.syncSuccess', { count: result.rowsSynced }));
      
      if (onSyncComplete) {
        onSyncComplete();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('sheets.syncError');
      showError(errorMessage);
      console.error('Error syncing to Google Sheets:', error);
      dispatch({ type: 'SET_FIELD', field: 'syncStatus', value: getSyncStatus() });
    } finally {
      dispatch({ type: 'SET_FIELD', field: 'isSyncing', value: false });
    }
  }, [showError, showSuccess, onSyncComplete, t]);

  const handleCreateSheet = async () => {
    if (!checkLoginStatus()) {
      showError(t('sheets.loginFirst'));
      return;
    }

    dispatch({ type: 'SET_FIELD', field: 'isCreatingSheet', value: true });
    try {
      const sheetInfo = await createSpreadsheet('Job Application Tracker');
      dispatch({ type: 'SET_FIELD', field: 'spreadsheetUrl', value: sheetInfo.spreadsheetUrl });
      showSuccess(t('sheets.spreadsheetCreated'));

      // Open spreadsheet in new tab
      window.open(sheetInfo.spreadsheetUrl, '_blank');

      // Auto-sync after creation
      setTimeout(() => {
        handleSync();
      }, 1000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('sheets.setError');
      showError(errorMessage);
      console.error('Error creating spreadsheet:', error);
    } finally {
      dispatch({ type: 'SET_FIELD', field: 'isCreatingSheet', value: false });
    }
  };

  const handleOpenSheet = () => {
    if (spreadsheetUrl) {
      window.open(spreadsheetUrl, '_blank');
    }
  };

  const handleSelectExistingSheet = async () => {
    if (!sheetIdInput.trim()) {
      showError(t('sheets.placeholder'));
      return;
    }

    dispatch({ type: 'SET_FIELD', field: 'isSettingSheet', value: true });
    try {
      const sheetInfo = await setSpreadsheetId(sheetIdInput);
      dispatch({ type: 'SET_FIELD', field: 'spreadsheetUrl', value: sheetInfo.spreadsheetUrl });
      dispatch({ type: 'SET_FIELD', field: 'showSelectSheet', value: false });
      dispatch({ type: 'SET_FIELD', field: 'sheetIdInput', value: '' });
      showSuccess(t('sheets.selectSuccess', { title: sheetInfo.title }));
      
      // Auto-sync after selection
      setTimeout(() => {
        handleSync();
      }, 1000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('sheets.setError');
      showError(errorMessage);
      console.error('Error setting spreadsheet:', error);
    } finally {
      dispatch({ type: 'SET_FIELD', field: 'isSettingSheet', value: false });
    }
  };

  const handleChangeSheet = () => {
    dispatch({ type: 'SET_FIELD', field: 'showSelectSheet', value: true });
    dispatch({ type: 'SET_FIELD', field: 'sheetIdInput', value: '' });
  };

  if (!isLoggedIn) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-yellow-800">
          <Trans i18nKey="sheets.loginRequired">
            <strong>Google Sheets Sync:</strong> Please log in with Google to enable spreadsheet synchronization.
          </Trans>
        </p>
      </div>
    );
  }

  const hasSpreadsheet = !!getStoredSpreadsheetId();
  const isLoading = isCreatingSheet || isSyncing || isSettingSheet;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('sheets.title')}</h3>
          
          <SyncStatusInfo
            hasSpreadsheet={hasSpreadsheet}
            syncStatus={syncStatus}
            spreadsheetUrl={spreadsheetUrl}
            onOpenSheet={handleOpenSheet}
            onChangeSheet={handleChangeSheet}
          />
        </div>

        <SyncActions
          hasSpreadsheet={hasSpreadsheet}
          isLoading={isLoading}
          isCreatingSheet={isCreatingSheet}
          isSyncing={isSyncing}
          onCreateSheet={handleCreateSheet}
          onSelectExisting={() => dispatch({ type: 'SET_FIELD', field: 'showSelectSheet', value: true })}
          onSync={handleSync}
        />
      </div>

      {showSelectSheet && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t('sheets.selectTitle')}</h4>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
            {t('sheets.selectDesc')}
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={sheetIdInput}
              onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'sheetIdInput', value: e.target.value })}
              placeholder={t('sheets.placeholder')}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSelectExistingSheet();
                } else if (e.key === 'Escape') {
                  dispatch({ type: 'SET_FIELD', field: 'showSelectSheet', value: false });
                  dispatch({ type: 'SET_FIELD', field: 'sheetIdInput', value: '' });
                }
              }}
            />
            <button
              onClick={handleSelectExistingSheet}
              disabled={isSettingSheet || !sheetIdInput.trim()}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                isSettingSheet || !sheetIdInput.trim()
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
              type="button"
            >
              {isSettingSheet ? t('sheets.setting') : t('sheets.set')}
            </button>
            <button
              onClick={() => {
                dispatch({ type: 'SET_FIELD', field: 'showSelectSheet', value: false });
                dispatch({ type: 'SET_FIELD', field: 'sheetIdInput', value: '' });
              }}
              disabled={isSettingSheet}
              className="px-4 py-2 rounded-lg font-medium text-sm bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 transition-colors"
              type="button"
            >
              {t('common.cancel')}
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Example: <code className="bg-gray-200 dark:bg-gray-600 px-1 rounded">1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms</code>
            <br />
            Or: <code className="bg-gray-200 dark:bg-gray-600 px-1 rounded">https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms</code>
          </p>
        </div>
      )}

      {syncStatus.lastSyncError && (
        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-300">
          <strong>{t('sheets.error')}:</strong> {syncStatus.lastSyncError}
        </div>
      )}
    </div>
  );
};

export default React.memo(GoogleSheetsSync, (prevProps, nextProps) => {
  // Re-render if applications count changed
  if (prevProps.applications.length !== nextProps.applications.length) {
    return false; // Props changed, re-render
  }
  
  // Re-render if any application ID changed (indicating data changed)
  const prevIds = new Set(prevProps.applications.map(app => app.id));
  const nextIds = new Set(nextProps.applications.map(app => app.id));
  
  if (prevIds.size !== nextIds.size) {
    return false; // Props changed, re-render
  }
  
  // Check if all IDs are the same
  for (const id of prevIds) {
    if (!nextIds.has(id)) {
      return false; // Props changed, re-render
    }
  }
  
  // Re-render if onSyncComplete reference changed
  if (prevProps.onSyncComplete !== nextProps.onSyncComplete) {
    return false; // Props changed, re-render
  }
  
  // Props are effectively the same, skip re-render
  return true;
});
