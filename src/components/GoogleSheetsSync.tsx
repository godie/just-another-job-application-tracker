
import React, { useReducer, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAlert } from './AlertProvider';
import { Card } from './ui/Card';
import { useAuthStore } from '../stores/authStore';
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
import SyncActions, { type SyncActionStatus } from './SyncActions';
import { SheetsAuthGate, type SheetsAuthStatus } from './SheetsAuthGate';
import { SheetSelectInput } from './SheetSelectInput';

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

      window.open(sheetInfo.spreadsheetUrl, '_blank');

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

  const hasSpreadsheet = !!getStoredSpreadsheetId();

  const authStatus: SheetsAuthStatus = !isAuthenticated ? 'unauthenticated'
    : !hasGoogleLinked ? 'unlinked'
    : isChecking ? 'checking'
    : !hasValidToken ? 'expired'
    : 'ready';

  const syncActionStatus: SyncActionStatus = isCreatingSheet ? 'creating'
    : isSyncing ? 'syncing'
    : isSettingSheet ? 'loading'
    : 'idle';

  return (
    <SheetsAuthGate
      status={authStatus}
      onTokenCheck={checkToken}
    >
    <Card className='p-4 mb-4'>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground mb-2">{t('sheets.title')}</h3>
          
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
          status={syncActionStatus}
          onCreateSheet={handleCreateSheet}
          onSelectExisting={() => dispatch({ type: 'SET_FIELD', field: 'showSelectSheet', value: true })}
          onSync={handleSync}
        />
      </div>

      {showSelectSheet && (
        <SheetSelectInput
          sheetIdInput={sheetIdInput}
          onSheetIdInputChange={(value) => dispatch({ type: 'SET_FIELD', field: 'sheetIdInput', value })}
          isSettingSheet={isSettingSheet}
          onSetSheet={handleSelectExistingSheet}
          onCancel={() => {
            dispatch({ type: 'SET_FIELD', field: 'showSelectSheet', value: false });
            dispatch({ type: 'SET_FIELD', field: 'sheetIdInput', value: '' });
          }}
        />
      )}

      {syncStatus.lastSyncError && (
        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-200">
          <strong>{t('sheets.error')}:</strong> {syncStatus.lastSyncError}
        </div>
      )}
    </Card>
    </SheetsAuthGate>
  );
};

export default React.memo(GoogleSheetsSync, (prevProps, nextProps) => {
  if (prevProps.applications.length !== nextProps.applications.length) {
    return false; // Props changed, re-render
  }
  
  const prevIds = new Set(prevProps.applications.map(app => app.id));
  const nextIds = new Set(nextProps.applications.map(app => app.id));
  
  if (prevIds.size !== nextIds.size) {
    return false; // Props changed, re-render
  }
  
  for (const id of prevIds) {
    if (!nextIds.has(id)) {
      return false; // Props changed, re-render
    }
  }
  
  if (prevProps.onSyncComplete !== nextProps.onSyncComplete) {
    return false; // Props changed, re-render
  }
  
  return true;
});
