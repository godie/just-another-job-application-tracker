// src/utils/googleSheets.ts

/**
 * Google Sheets integration utilities
 * Handles synchronization between local storage and Google Sheets
 */

import type { JobApplication } from '../types/applications';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export interface SheetInfo {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
}

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime: string | null;
  lastSyncError: string | null;
  spreadsheetId: string | null;
}

const SYNC_STATUS_KEY = 'googleSheetsSyncStatus';
const SPREADSHEET_ID_KEY = 'googleSheetsSpreadsheetId';

/**
 * Get stored sync status
 */
export const getSyncStatus = (): SyncStatus => {
  try {
    const stored = localStorage.getItem(SYNC_STATUS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error reading sync status:', error);
  }
  
  return {
    isSyncing: false,
    lastSyncTime: null,
    lastSyncError: null,
    spreadsheetId: getStoredSpreadsheetId(),
  };
};

/**
 * Save sync status
 */
export const saveSyncStatus = (status: Partial<SyncStatus>): void => {
  try {
    const current = getSyncStatus();
    const updated = { ...current, ...status };
    localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving sync status:', error);
  }
};

/**
 * Get stored spreadsheet ID
 */
export const getStoredSpreadsheetId = (): string | null => {
  try {
    return localStorage.getItem(SPREADSHEET_ID_KEY);
  } catch {
    return null;
  }
};

/**
 * Store spreadsheet ID
 */
export const storeSpreadsheetId = (spreadsheetId: string): void => {
  try {
    localStorage.setItem(SPREADSHEET_ID_KEY, spreadsheetId);
    saveSyncStatus({ spreadsheetId });
  } catch (error) {
    console.error('Error storing spreadsheet ID:', error);
  }
};

/**
 * Create a new Google Sheet (Laravel POST /api/google-sheets).
 */
export const createSpreadsheet = async (title: string = 'Job Application Tracker'): Promise<SheetInfo> => {
  try {
    const response = await fetch(`${API_BASE_URL}/google-sheets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        action: 'create_sheet',
        title,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to create spreadsheet');
    }

    // Store spreadsheet ID
    storeSpreadsheetId(result.spreadsheetId);
    saveSyncStatus({
      lastSyncError: null,
    });

    return {
      spreadsheetId: result.spreadsheetId,
      spreadsheetUrl: result.spreadsheetUrl,
      title,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    saveSyncStatus({
      lastSyncError: errorMessage,
    });
    throw error;
  }
};

/**
 * Sync job applications to Google Sheet
 */
export const syncToGoogleSheets = async (
  applications: JobApplication[],
  spreadsheetId?: string
): Promise<{ rowsSynced: number }> => {
  const targetSpreadsheetId = spreadsheetId || getStoredSpreadsheetId();
  
  if (!targetSpreadsheetId) {
    throw new Error('No spreadsheet ID found. Please create a spreadsheet first.');
  }

  try {
    saveSyncStatus({ isSyncing: true, lastSyncError: null });

    const response = await fetch(`${API_BASE_URL}/google-sheets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        action: 'sync_data',
        spreadsheetId: targetSpreadsheetId,
        applications,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to sync data');
    }

    // Update sync status
    saveSyncStatus({
      isSyncing: false,
      lastSyncTime: new Date().toISOString(),
      lastSyncError: null,
      spreadsheetId: targetSpreadsheetId,
    });

    return {
      rowsSynced: result.rowsSynced || 0,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    saveSyncStatus({
      isSyncing: false,
      lastSyncError: errorMessage,
    });
    throw error;
  }
};

/**
 * Set spreadsheet ID manually (for selecting existing spreadsheet)
 */
export const setSpreadsheetId = async (spreadsheetIdOrUrl: string): Promise<SheetInfo> => {
  // Extract ID from URL if full URL is provided
  let spreadsheetId = spreadsheetIdOrUrl.trim();
  
  // Check if it's a full URL
  const urlMatch = spreadsheetId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch) {
    spreadsheetId = urlMatch[1];
  }
  
  // Validate format (Google Sheets IDs are alphanumeric with dashes/underscores)
  if (!/^[a-zA-Z0-9-_]+$/.test(spreadsheetId)) {
    throw new Error('Invalid spreadsheet ID or URL format');
  }
  
  try {
    // Verify the spreadsheet exists and is accessible
    const info = await getSpreadsheetInfo(spreadsheetId);
    
    // Store the spreadsheet ID
    storeSpreadsheetId(spreadsheetId);
    saveSyncStatus({
      lastSyncError: null,
      spreadsheetId,
    });
    
    const spreadsheetInfo = info as { properties?: { title?: string } };
    return {
      spreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
      title: spreadsheetInfo.properties?.title || 'Unknown',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    saveSyncStatus({
      lastSyncError: errorMessage,
    });
    throw new Error(`Failed to access spreadsheet: ${errorMessage}`);
  }
};

/**
 * Get spreadsheet information
 */
const getSpreadsheetInfo = async (spreadsheetId: string): Promise<Record<string, unknown>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/google-sheets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        action: 'get_sheet_info',
        spreadsheetId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to get spreadsheet info');
    }

    return result.spreadsheet;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(errorMessage);
  }
};

/**
 * Format last sync time for display
 */
export const formatLastSyncTime = (isoString: string | null): string => {
  if (!isoString) return 'Never';
  
  try {
    const date = new Date(isoString);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Unknown';
    }
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Unknown';
  }
};

