
import { describe, test, expect, beforeEach, vi } from 'vitest';
import {
  getSyncStatus,
  saveSyncStatus,
  getStoredSpreadsheetId,
  storeSpreadsheetId,
  createSpreadsheet,
  syncToGoogleSheets,
  formatLastSyncTime,
  type SyncStatus,
} from '../utils/googleSheets';
import type { JobApplication } from '../types/applications';

global.fetch = vi.fn();

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('Google Sheets Utilities', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('getSyncStatus', () => {
    test('should return default status when no stored status exists', () => {
      const status = getSyncStatus();
      expect(status).toEqual({
        isSyncing: false,
        lastSyncTime: null,
        lastSyncError: null,
        spreadsheetId: null,
      });
    });

    test('should return stored status when it exists', () => {
      const storedStatus: SyncStatus = {
        isSyncing: false,
        lastSyncTime: '2024-01-01T00:00:00.000Z',
        lastSyncError: null,
        spreadsheetId: 'test-id',
      };
      localStorageMock.setItem('googleSheetsSyncStatus', JSON.stringify(storedStatus));
      
      const status = getSyncStatus();
      expect(status).toEqual(storedStatus);
    });

    test('should handle invalid JSON gracefully', () => {
      localStorageMock.setItem('googleSheetsSyncStatus', 'invalid-json');
      
      const status = getSyncStatus();
      expect(status).toEqual({
        isSyncing: false,
        lastSyncTime: null,
        lastSyncError: null,
        spreadsheetId: null,
      });
    });
  });

  describe('saveSyncStatus', () => {
    test('should save partial status updates', () => {
      const initialStatus: SyncStatus = {
        isSyncing: false,
        lastSyncTime: null,
        lastSyncError: null,
        spreadsheetId: null,
      };
      localStorageMock.setItem('googleSheetsSyncStatus', JSON.stringify(initialStatus));
      
      saveSyncStatus({ lastSyncTime: '2024-01-01T00:00:00.000Z' });
      
      const saved = JSON.parse(localStorageMock.getItem('googleSheetsSyncStatus') || '{}');
      expect(saved.lastSyncTime).toBe('2024-01-01T00:00:00.000Z');
      expect(saved.isSyncing).toBe(false);
    });

    test('should merge with existing status', () => {
      const existingStatus: SyncStatus = {
        isSyncing: false,
        lastSyncTime: '2024-01-01T00:00:00.000Z',
        lastSyncError: 'Previous error',
        spreadsheetId: 'old-id',
      };
      localStorageMock.setItem('googleSheetsSyncStatus', JSON.stringify(existingStatus));
      
      saveSyncStatus({ lastSyncError: null });
      
      const saved = JSON.parse(localStorageMock.getItem('googleSheetsSyncStatus') || '{}');
      expect(saved.lastSyncError).toBeNull();
      expect(saved.lastSyncTime).toBe('2024-01-01T00:00:00.000Z');
      expect(saved.spreadsheetId).toBe('old-id');
    });
  });

  describe('getStoredSpreadsheetId', () => {
    test('should return null when no ID is stored', () => {
      expect(getStoredSpreadsheetId()).toBeNull();
    });

    test('should return stored spreadsheet ID', () => {
      localStorageMock.setItem('googleSheetsSpreadsheetId', 'test-spreadsheet-id');
      expect(getStoredSpreadsheetId()).toBe('test-spreadsheet-id');
    });
  });

  describe('storeSpreadsheetId', () => {
    test('should store spreadsheet ID and update sync status', () => {
      storeSpreadsheetId('new-spreadsheet-id');
      
      expect(localStorageMock.getItem('googleSheetsSpreadsheetId')).toBe('new-spreadsheet-id');
      const status = JSON.parse(localStorageMock.getItem('googleSheetsSyncStatus') || '{}');
      expect(status.spreadsheetId).toBe('new-spreadsheet-id');
    });
  });

  describe('createSpreadsheet', () => {
    test('should create spreadsheet successfully', async () => {
      const mockResponse = {
        success: true,
        spreadsheetId: 'test-id-123',
        spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/test-id-123',
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await createSpreadsheet('Test Sheet');

      expect(result).toEqual({
        spreadsheetId: 'test-id-123',
        spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/test-id-123',
        title: 'Test Sheet',
      });

      expect(localStorageMock.getItem('googleSheetsSpreadsheetId')).toBe('test-id-123');
    });

    test('should handle API errors', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      });

      await expect(createSpreadsheet('Test Sheet')).rejects.toThrow('Unauthorized');
    });

    test('should handle network errors', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'));

      await expect(createSpreadsheet('Test Sheet')).rejects.toThrow('Network error');
    });

    test('should use default title when not provided', async () => {
      const mockResponse = {
        success: true,
        spreadsheetId: 'test-id',
        spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/test-id',
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await createSpreadsheet();
      expect(result.title).toBe('Job Application Tracker');
    });
  });

  describe('syncToGoogleSheets', () => {
    const mockApplications: JobApplication[] = [
      {
        id: '1',
        position: 'Software Engineer',
        company: 'Tech Corp',
        salary: '100k',
        status: 'Applied',
        applicationDate: '2024-01-01',
        interviewDate: '',
        timeline: [],
        notes: '',
        link: 'https://example.com',
        platform: 'LinkedIn',
        contactName: 'John Doe',
        followUpDate: '',
      },
    ];

    test('should sync applications successfully', async () => {
      localStorageMock.setItem('googleSheetsSpreadsheetId', 'test-id');
      
      const mockResponse = {
        success: true,
        rowsSynced: 1,
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await syncToGoogleSheets(mockApplications);

      expect(result.rowsSynced).toBe(1);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/google-sheets'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('sync_data'),
        })
      );
    });

    test('should throw error when no spreadsheet ID exists', async () => {
      await expect(syncToGoogleSheets(mockApplications)).rejects.toThrow(
        'No spreadsheet ID found'
      );
    });

    test('should use provided spreadsheet ID', async () => {
      const mockResponse = {
        success: true,
        rowsSynced: 1,
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await syncToGoogleSheets(mockApplications, 'custom-id');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('custom-id'),
        })
      );
    });

    test('should handle sync errors', async () => {
      localStorageMock.setItem('googleSheetsSpreadsheetId', 'test-id');

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      });

      await expect(syncToGoogleSheets(mockApplications)).rejects.toThrow('Server error');
    });

    test('should update sync status on success', async () => {
      localStorageMock.setItem('googleSheetsSpreadsheetId', 'test-id');
      
      const mockResponse = {
        success: true,
        rowsSynced: 1,
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await syncToGoogleSheets(mockApplications);

      const status = JSON.parse(localStorageMock.getItem('googleSheetsSyncStatus') || '{}');
      expect(status.isSyncing).toBe(false);
      expect(status.lastSyncTime).toBeTruthy();
      expect(status.lastSyncError).toBeNull();
    });

    test('should update sync status on error', async () => {
      localStorageMock.setItem('googleSheetsSpreadsheetId', 'test-id');

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      });

      try {
        await syncToGoogleSheets(mockApplications);
      } catch {
        /* error captured in sync status below */
      }

      const status = JSON.parse(localStorageMock.getItem('googleSheetsSyncStatus') || '{}');
      expect(status.isSyncing).toBe(false);
      expect(status.lastSyncError).toBe('Server error');
    });
  });

  describe('formatLastSyncTime', () => {
    test('should return "Never" for null input', () => {
      expect(formatLastSyncTime(null)).toBe('Never');
    });

    test('should return "Just now" for very recent times', () => {
      const now = new Date().toISOString();
      expect(formatLastSyncTime(now)).toBe('Just now');
    });

    test('should format minutes ago correctly', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      expect(formatLastSyncTime(fiveMinutesAgo)).toBe('5 minutes ago');
    });

    test('should format hours ago correctly', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      expect(formatLastSyncTime(twoHoursAgo)).toBe('2 hours ago');
    });

    test('should format days ago correctly', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatLastSyncTime(threeDaysAgo)).toBe('3 days ago');
    });

    test('should format older dates with full date and time', () => {
      const oldDate = new Date('2020-01-01T12:00:00Z').toISOString();
      const formatted = formatLastSyncTime(oldDate);
      expect(formatted).toContain('1/1/2020');
    });

    test('should handle invalid date strings gracefully', () => {
      expect(formatLastSyncTime('invalid-date')).toBe('Unknown');
    });
  });
});

