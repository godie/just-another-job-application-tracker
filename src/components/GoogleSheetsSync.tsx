// src/components/GoogleSheetsSync.tsx

import React, { useReducer, useEffect, useCallback, useRef } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { useAlert } from './AlertProvider';
import { Card } from './ui/Card';
import { useAuthStore } from '../stores/authStore';
import { ConnectGoogleButton } from './ConnectGoogleButton';
import { useGoogleToken } from '../hooks/useGoogleToken';
import {
  createSpreadsheet,
  syncToGoogleSheets,
  getSyncStatus,
  getStoredSpreadsheetId,
  setSpreadsheetId,
  type SyncStatus,
} from '../utils/googleSheets';
import type { JobApplication } from '../types/applications';
import SyncStatusInfo from './SyncStatusInfo';
import SyncActions from './SyncActions';

interface GoogleSheetsSyncProps {
  applications: JobApplication[];
  onSyncComplete?: () => void;
}

interface GoogleSheetsSyncState {
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
  | { type: 'UPDATE_STATUS'; syncStatus: SyncStatus; spreadsheetUrl: string | null };

const googleSheetsSyncReducer = (state: GoogleSheetsSyncState, action: GoogleSheetsSyncAction): GoogleSheetsSyncState => {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'UPDATE_STATUS':
      return {
        ...state,
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

  const currentUser = useAuthStore((state) => state.currentUser);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasGoogleLinked = !!(currentUser?.googleId);

  const { hasValidToken, isChecking, checkToken } = useGoogleToken();

  const [state, dispatch] = useReducer(googleSheetsSyncReducer, undefined, () => ({
    syncStatus: getSyncStatus(),
    isCreatingSheet: false,
    isSyncing: false,
    spreadsheetUrl: null,
    showSelectSheet: false,
    sheetIdInput: '',
    isSettingSheet: false,
  }));

  const {
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
      const status = getSyncStatus();
      const spreadsheetId = getStoredSpreadsheetId();
      const url = spreadsheetId ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}` : null;

      dispatch({
        type: 'UPDATE_STATUS',
        syncStatus: status,
        spreadsheetUrl: url,
      });
    };

    updateStatus();

    // Poll periodically for sync status / spreadsheet changes
    const interval = setInterval(updateStatus, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const handleSync = useCallback(async () => {
    if (!hasGoogleLinked) {
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
  }, [hasGoogleLinked, showError, showSuccess, onSyncComplete, t]);

  const handleCreateSheet = async () => {
    if (!hasGoogleLinked) {
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

  // Not authenticated at all
  if (!isAuthenticated) {
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

  // Authenticated but no Google account linked
  if (!hasGoogleLinked) {
    return (
      <div className="bg-sage-50 dark:bg-sage-900/20 border border-sage-200 dark:border-sage-700 rounded-lg p-6 mb-4">
        <div className="text-center">
          <div className="size-12 mx-auto mb-3 rounded-full bg-sage-100 dark:bg-sage-800 flex items-center justify-center">
            <svg className="size-6 text-sage-600 dark:text-sage-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 5.25 1.65 5.25 1.65l1.83-1.8S16.22 2 12.17 2C6.63 2 2 6.44 2 12c0 5.52 4.46 10 10 10 5.14 0 9.35-3.65 9.35-8.77 0-1.15-.14-2.13 0-2.13z" fill="#4285F4"/>
            </svg>
          </div>
          <h4 className="text-sm font-semibold text-sage-700 dark:text-sage-300 mb-2">
            {t('sheets.googleNotLinked')}
          </h4>
          <p className="text-xs text-sage-600 dark:text-sage-400 mb-4">
            {t('sheets.googleNotLinkedDesc')}
          </p>
          <ConnectGoogleButton
            label={t('settings.cloud.linkGoogle')}
            onSuccess={checkToken}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-sage-600 text-white hover:bg-sage-700 transition-colors rounded disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>
    );
  }

  // Google account linked but token is expired/revoked
  if (hasGoogleLinked && !isChecking && !hasValidToken) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-6 mb-4">
        <div className="text-center">
          <div className="size-12 mx-auto mb-3 rounded-full bg-amber-100 dark:bg-amber-800 flex items-center justify-center">
            <svg className="size-6 text-amber-600 dark:text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m0-8v4m0 0a9 9 0 110-18 9 9 0 010 18z" />
            </svg>
          </div>
          <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-2">
            {t('sheets.googleSessionExpired')}
          </h4>
          <p className="text-xs text-amber-600 dark:text-amber-400 mb-4">
            {t('sheets.googleSessionExpiredDesc')}
          </p>
          <ConnectGoogleButton
            label={t('settings.cloud.linkGoogle')}
            onSuccess={checkToken}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-amber-600 text-white hover:bg-amber-700 transition-colors rounded disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>
    );
  }

  // Still checking token validity — show loading
  if (isChecking) {
    return (
      <div className="flex items-center justify-center py-6 mb-4">
        <span className="size-5 border-2 border-sage-400 border-t-transparent rounded-full animate-spin mr-2" />
        <span className="text-sm text-earth-500 dark:text-earth-400">{t('common.loading')}</span>
      </div>
    );
  }

  const hasSpreadsheet = !!getStoredSpreadsheetId();
  const isLoading = isCreatingSheet || isSyncing || isSettingSheet;

  return (
    <Card className='p-4 mb-4'>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-earth-800 dark:text-earth-100 mb-2">{t('sheets.title')}</h3>
          
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
        <div className="mt-4 p-4 bg-earth-50 dark:bg-earth-700 rounded-lg">
          <h4 className="text-sm font-semibold text-earth-800 dark:text-earth-100 mb-2">{t('sheets.selectTitle')}</h4>
          <p className="text-xs text-earth-600 dark:text-earth-400 mb-3">
            {t('sheets.selectDesc')}
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={sheetIdInput}
              onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'sheetIdInput', value: e.target.value })}
              placeholder={t('sheets.placeholder')}
              aria-label={t('sheets.placeholder')}
              className="flex-1 px-3 py-2 border border-earth-300 dark:border-earth-600 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-earth-800 text-earth-900 dark:text-earth-100"
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
                  ? 'bg-earth-300 text-earth-500 dark:bg-earth-600 dark:text-earth-400 cursor-not-allowed'
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
              className="px-4 py-2 rounded font-medium text-sm bg-white dark:bg-earth-800 hover:bg-earth-100 dark:hover:bg-earth-700 text-earth-700 dark:text-earth-300 border border-earth-300 dark:border-earth-600 transition-colors"
              type="button"
            >
              {t('common.cancel')}
            </button>
          </div>
          <p className="text-xs text-earth-500 dark:text-earth-400 mt-2">
            Example:            <code className="bg-earth-200 dark:bg-earth-600 px-1 rounded">1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms</code>
            <br />
            Or:            <code className="bg-earth-200 dark:bg-earth-600 px-1 rounded">https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms</code>
          </p>
        </div>
      )}

      {syncStatus.lastSyncError && (
        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-300">
          <strong>{t('sheets.error')}:</strong> {syncStatus.lastSyncError}
        </div>
      )}
    </Card>
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
