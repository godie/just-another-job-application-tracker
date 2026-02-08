// src/components/GoogleSheetsSync.tsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { useAlert } from './AlertProvider';
import { checkLoginStatus } from '../utils/localStorage';
import {
  createSpreadsheet,
  syncToGoogleSheets,
  getSyncStatus,
  getStoredSpreadsheetId,
  formatLastSyncTime,
  setSpreadsheetId,
  type SyncStatus,
} from '../utils/googleSheets';
import type { JobApplication } from '../utils/localStorage';

interface GoogleSheetsSyncProps {
  applications: JobApplication[];
  onSyncComplete?: () => void;
}

const GoogleSheetsSync: React.FC<GoogleSheetsSyncProps> = ({ applications, onSyncComplete }) => {
  const { t } = useTranslation();
  // ⚡ Bolt: Use ref to store the latest applications without causing re-renders
  // This allows handleSync to always use the most recent data without
  // the component needing to re-render when applications array reference changes
  const applicationsRef = useRef(applications);
  applicationsRef.current = applications;
  const { showSuccess, showError } = useAlert();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(getSyncStatus());
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(null);
  const [showSelectSheet, setShowSelectSheet] = useState(false);
  const [sheetIdInput, setSheetIdInput] = useState('');
  const [isSettingSheet, setIsSettingSheet] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      setIsLoggedIn(checkLoginStatus());
      setSyncStatus(getSyncStatus());
      
      // Load spreadsheet URL if ID exists
      const spreadsheetId = getStoredSpreadsheetId();
      if (spreadsheetId) {
        setSpreadsheetUrl(`https://docs.google.com/spreadsheets/d/${spreadsheetId}`);
      }
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

  const handleCreateSheet = async () => {
    if (!isLoggedIn) {
      showError(t('sheets.loginFirst'));
      return;
    }

    setIsCreatingSheet(true);
    try {
      const sheetInfo = await createSpreadsheet('Job Application Tracker');
      setSpreadsheetUrl(sheetInfo.spreadsheetUrl);
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
      setIsCreatingSheet(false);
    }
  };

  // ⚡ Bolt: Memoize handleSync to prevent recreation on every render
  // Use applicationsRef.current to always get the latest applications without
  // causing re-renders when the applications prop changes
  // Read isLoggedIn directly from checkLoginStatus() to avoid dependency on state
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

    setIsSyncing(true);
    try {
      // Use ref to get latest applications without dependency on applications prop
      const result = await syncToGoogleSheets(applicationsRef.current, spreadsheetId);
      setSyncStatus(getSyncStatus());
      showSuccess(t('sheets.syncSuccess', { count: result.rowsSynced }));
      
      if (onSyncComplete) {
        onSyncComplete();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('sheets.syncError');
      showError(errorMessage);
      console.error('Error syncing to Google Sheets:', error);
      setSyncStatus(getSyncStatus());
    } finally {
      setIsSyncing(false);
    }
  }, [showError, showSuccess, onSyncComplete, t]);

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

    setIsSettingSheet(true);
    try {
      const sheetInfo = await setSpreadsheetId(sheetIdInput);
      setSpreadsheetUrl(sheetInfo.spreadsheetUrl);
      setShowSelectSheet(false);
      setSheetIdInput('');
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
      setIsSettingSheet(false);
    }
  };

  const handleChangeSheet = () => {
    setShowSelectSheet(true);
    setSheetIdInput('');
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
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('sheets.title')}</h3>
          
          {hasSpreadsheet ? (
            <div className="space-y-1">
              <p className="text-sm text-gray-600">
                <span className="font-medium">{t('sheets.status')}:</span>{' '}
                {syncStatus.lastSyncError ? (
                  <span className="text-red-600">{t('common.status')}: {syncStatus.lastSyncError}</span>
                ) : syncStatus.lastSyncTime ? (
                  <span className="text-green-600">{t('sheets.synced', { time: formatLastSyncTime(syncStatus.lastSyncTime) })}</span>
                ) : (
                  <span className="text-gray-500">{t('sheets.notSynced')}</span>
                )}
              </p>
              {spreadsheetUrl && (
                <div className="flex gap-3 items-center">
                  <button
                    onClick={handleOpenSheet}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                    type="button"
                  >
                    {t('sheets.openSheet')}
                  </button>
                  <button
                    onClick={handleChangeSheet}
                    className="text-sm text-gray-600 hover:text-gray-800 underline"
                    type="button"
                  >
                    {t('sheets.changeSheet')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              {t('sheets.createSheetDesc')}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          {!hasSpreadsheet ? (
            <>
              <button
                onClick={handleCreateSheet}
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
                onClick={() => setShowSelectSheet(true)}
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
              onClick={handleSync}
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
      </div>

      {showSelectSheet && (
        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">{t('sheets.selectTitle')}</h4>
          <p className="text-xs text-gray-600 mb-3">
            {t('sheets.selectDesc')}
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={sheetIdInput}
              onChange={(e) => setSheetIdInput(e.target.value)}
              placeholder={t('sheets.placeholder')}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSelectExistingSheet();
                } else if (e.key === 'Escape') {
                  setShowSelectSheet(false);
                  setSheetIdInput('');
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
                setShowSelectSheet(false);
                setSheetIdInput('');
              }}
              disabled={isSettingSheet}
              className="px-4 py-2 rounded-lg font-medium text-sm bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 transition-colors"
              type="button"
            >
              {t('common.cancel')}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Example: <code className="bg-gray-200 px-1 rounded">1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms</code>
            <br />
            Or: <code className="bg-gray-200 px-1 rounded">https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms</code>
          </p>
        </div>
      )}

      {syncStatus.lastSyncError && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
          <strong>{t('sheets.error')}:</strong> {syncStatus.lastSyncError}
        </div>
      )}
    </div>
  );
};

// ⚡ Bolt: Memoize component to prevent re-renders when applications array reference changes
// but content is the same. Only re-render if applications length or IDs change.
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
