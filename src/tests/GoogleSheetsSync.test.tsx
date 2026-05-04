// src/tests/GoogleSheetsSync.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { expect, test, describe, beforeEach, vi } from 'vitest';
import GoogleSheetsSync from '../components/GoogleSheetsSync';
import { AlertProvider } from '../components/AlertProvider';
import * as googleSheetsUtils from '../utils/googleSheets';
import type { JobApplication } from '../utils/localStorage';

// Mock localStorage
const localStorageStore: Record<string, string> = {};

// Mock window.open
const mockWindowOpen = vi.fn();
window.open = mockWindowOpen;

// Auth state control for useAuthStore mock
let mockIsAuthenticated = false;

// Mock auth store — component now reads isAuthenticated from here instead of localStorage
vi.mock('../stores/authStore', () => ({
  useAuthStore: vi.fn((selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      currentUser: mockIsAuthenticated ? { id: 1, email: 'test@example.com' } : null,
      isAuthenticated: mockIsAuthenticated,
      isLoading: false,
      error: null,
      setUser: vi.fn(),
      setError: vi.fn(),
      setLoading: vi.fn(),
      login: vi.fn(),
      register: vi.fn(),
      loginWithGoogle: vi.fn(),
      loginWithLinkedIn: vi.fn(),
      logout: vi.fn(),
      fetchMe: vi.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

// Mock the localStorage utilities (still needed for type re-export)
vi.mock('../utils/localStorage', () => ({
  getApplications: vi.fn(() => []),
  saveApplications: vi.fn(),
}));

// Mock the googleSheets utilities
vi.mock('../utils/googleSheets', () => ({
  createSpreadsheet: vi.fn(),
  syncToGoogleSheets: vi.fn(),
  getSyncStatus: vi.fn(() => ({
    isSyncing: false,
    lastSyncTime: null,
    lastSyncError: null,
    spreadsheetId: null,
  })),
  getStoredSpreadsheetId: vi.fn(() => localStorageStore['googleSheetsSpreadsheetId'] || null),
  formatLastSyncTime: vi.fn((time: string | null) => {
    if (!time) return 'Never';
    return '2 minutes ago';
  }),
}));

// Helper function to render with AlertProvider
const renderWithProviders = (ui: React.ReactElement) => {
  return render(<AlertProvider>{ui}</AlertProvider>);
};

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

describe('GoogleSheetsSync Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(localStorageStore).forEach(key => delete localStorageStore[key]);
    mockIsAuthenticated = false;
    mockWindowOpen.mockClear();
  });

  describe('When user is not logged in', () => {
    test('should show login prompt message', () => {
      renderWithProviders(<GoogleSheetsSync applications={mockApplications} />);
      
      expect(screen.getByText(/Please log in with Google to enable spreadsheet synchronization/i)).toBeInTheDocument();
    });

    test('should not show sync controls when not logged in', () => {
      renderWithProviders(<GoogleSheetsSync applications={mockApplications} />);
      
      expect(screen.queryByText('Create Sheet')).not.toBeInTheDocument();
      expect(screen.queryByText('Sync Now')).not.toBeInTheDocument();
    });
  });

  describe('When user is logged in', () => {
    beforeEach(() => {
      mockIsAuthenticated = true;
    });

    test('should show create sheet button when no spreadsheet exists', () => {
      renderWithProviders(<GoogleSheetsSync applications={mockApplications} />);
      
      expect(screen.getByText('Create Sheet')).toBeInTheDocument();
      expect(screen.getByText(/Create a Google Sheet to sync your job applications/i)).toBeInTheDocument();
    });

    test('should show sync button when spreadsheet exists', () => {
      localStorageStore['googleSheetsSpreadsheetId'] = 'test-id-123';
      
      renderWithProviders(<GoogleSheetsSync applications={mockApplications} />);
      
      expect(screen.getByText('Sync Now')).toBeInTheDocument();
      expect(screen.queryByText('Create Sheet')).not.toBeInTheDocument();
    });

    test('should show sync status when spreadsheet exists', () => {
      localStorageStore['googleSheetsSpreadsheetId'] = 'test-id-123';
      vi.mocked(googleSheetsUtils.getSyncStatus).mockReturnValue({
        isSyncing: false,
        lastSyncTime: null,
        lastSyncError: null,
        spreadsheetId: 'test-id-123',
      });

      renderWithProviders(<GoogleSheetsSync applications={mockApplications} />);
      
      expect(screen.getByText(/Status:/i)).toBeInTheDocument();
      expect(screen.getByText(/Not synced yet/i)).toBeInTheDocument();
    });

    test('should show last sync time when available', () => {
      localStorageStore['googleSheetsSpreadsheetId'] = 'test-id-123';
      vi.mocked(googleSheetsUtils.getSyncStatus).mockReturnValue({
        isSyncing: false,
        lastSyncTime: '2024-01-01T00:00:00Z',
        lastSyncError: null,
        spreadsheetId: 'test-id-123',
      });

      renderWithProviders(<GoogleSheetsSync applications={mockApplications} />);
      
      expect(screen.getByText(/Synced/i)).toBeInTheDocument();
    });

    test('should show error message when sync error exists', () => {
      localStorageStore['googleSheetsSpreadsheetId'] = 'test-id-123';
      vi.mocked(googleSheetsUtils.getSyncStatus).mockReturnValue({
        isSyncing: false,
        lastSyncTime: null,
        lastSyncError: 'Failed to sync',
        spreadsheetId: 'test-id-123',
      });

      renderWithProviders(<GoogleSheetsSync applications={mockApplications} />);
      
      expect(screen.getByText(/Sync Error:/i)).toBeInTheDocument();
      const errorTexts = screen.getAllByText(/Failed to sync/i);
      expect(errorTexts.length).toBeGreaterThan(0);
    });

    test('should show "Open Spreadsheet" link when spreadsheet exists', () => {
      localStorageStore['googleSheetsSpreadsheetId'] = 'test-id-123';
      
      renderWithProviders(<GoogleSheetsSync applications={mockApplications} />);
      
      const openLink = screen.getByText('Open Spreadsheet →');
      expect(openLink).toBeInTheDocument();
    });
  });

  describe('Create Sheet functionality', () => {
    beforeEach(() => {
      mockIsAuthenticated = true;
    });

    test('should call createSpreadsheet when button is clicked', async () => {
      const mockSheetInfo = {
        spreadsheetId: 'new-id-123',
        spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/new-id-123',
        title: 'Job Application Tracker',
      };

      vi.mocked(googleSheetsUtils.createSpreadsheet).mockResolvedValue(mockSheetInfo);
      vi.mocked(googleSheetsUtils.syncToGoogleSheets).mockResolvedValue({ rowsSynced: 1 });

      renderWithProviders(<GoogleSheetsSync applications={mockApplications} />);
      
      const createButton = screen.getByText('Create Sheet');
      await act(async () => {
        fireEvent.click(createButton);
      });

      expect(googleSheetsUtils.createSpreadsheet).toHaveBeenCalledWith('Job Application Tracker');
    });

    test('should show error when createSpreadsheet fails', async () => {
      vi.mocked(googleSheetsUtils.createSpreadsheet).mockRejectedValue(new Error('API Error'));

      renderWithProviders(<GoogleSheetsSync applications={mockApplications} />);
      
      const createButton = screen.getByText('Create Sheet');
      await act(async () => {
        fireEvent.click(createButton);
      });

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(/API Error/i);
    });

    test('should open spreadsheet in new tab after creation', async () => {
      const mockSheetInfo = {
        spreadsheetId: 'new-id-123',
        spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/new-id-123',
        title: 'Job Application Tracker',
      };

      vi.mocked(googleSheetsUtils.createSpreadsheet).mockResolvedValue(mockSheetInfo);
      vi.mocked(googleSheetsUtils.syncToGoogleSheets).mockResolvedValue({ rowsSynced: 1 });

      renderWithProviders(<GoogleSheetsSync applications={mockApplications} />);
      
      const createButton = screen.getByText('Create Sheet');
      await act(async () => {
        fireEvent.click(createButton);
      });

      await waitFor(() => {
        expect(mockWindowOpen).toHaveBeenCalledWith(
          'https://docs.google.com/spreadsheets/d/new-id-123',
          '_blank'
        );
      });
    });

    test('should disable button while creating', async () => {
      let resolveCreate: (value: googleSheetsUtils.SheetInfo) => void;
      const createPromise = new Promise<googleSheetsUtils.SheetInfo>((resolve) => {
        resolveCreate = resolve;
      });

      vi.mocked(googleSheetsUtils.createSpreadsheet).mockReturnValue(createPromise);

      renderWithProviders(<GoogleSheetsSync applications={mockApplications} />);
      
      const createButton = screen.getByText('Create Sheet');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(createButton).toBeDisabled();
        expect(createButton).toHaveTextContent('Creating...');
      });

      await act(async () => {
        resolveCreate!({
          spreadsheetId: 'new-id',
          spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/new-id',
          title: 'Test',
        });
        await createPromise;
      });

      await waitFor(() => {
        expect(createButton).not.toBeDisabled();
      });
    });
  });

  describe('Sync functionality', () => {
    beforeEach(() => {
      mockIsAuthenticated = true;
      localStorageStore['googleSheetsSpreadsheetId'] = 'test-id-123';
    });

    test('should call syncToGoogleSheets when sync button is clicked', async () => {
      vi.mocked(googleSheetsUtils.syncToGoogleSheets).mockResolvedValue({ rowsSynced: 2 });

      renderWithProviders(<GoogleSheetsSync applications={mockApplications} />);
      
      const syncButton = screen.getByText('Sync Now');
      await act(async () => {
        fireEvent.click(syncButton);
      });

      expect(googleSheetsUtils.syncToGoogleSheets).toHaveBeenCalledWith(
        mockApplications,
        'test-id-123'
      );
    });

    test('should show success message after successful sync', async () => {
      vi.mocked(googleSheetsUtils.syncToGoogleSheets).mockResolvedValue({ rowsSynced: 1 });

      renderWithProviders(<GoogleSheetsSync applications={mockApplications} />);
      
      const syncButton = screen.getByText('Sync Now');
      await act(async () => {
        fireEvent.click(syncButton);
      });

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(/Successfully synced 1 application/i);
    });

    test('should show error message when sync fails', async () => {
      vi.mocked(googleSheetsUtils.syncToGoogleSheets).mockRejectedValue(new Error('Sync failed'));

      renderWithProviders(<GoogleSheetsSync applications={mockApplications} />);
      
      const syncButton = screen.getByText('Sync Now');
      await act(async () => {
        fireEvent.click(syncButton);
      });

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(/Sync failed/i);
    });

    test('should call onSyncComplete callback after successful sync', async () => {
      const onSyncComplete = vi.fn();
      vi.mocked(googleSheetsUtils.syncToGoogleSheets).mockResolvedValue({ rowsSynced: 1 });

      renderWithProviders(
        <GoogleSheetsSync 
          applications={mockApplications} 
          onSyncComplete={onSyncComplete}
        />
      );
      
      const syncButton = screen.getByText('Sync Now');
      await act(async () => {
        fireEvent.click(syncButton);
      });

      await waitFor(() => {
        expect(onSyncComplete).toHaveBeenCalled();
      });
    });

    test('should disable button while syncing', async () => {
      let resolveSync: (value: { rowsSynced: number }) => void;
      const syncPromise = new Promise<{ rowsSynced: number }>((resolve) => {
        resolveSync = resolve;
      });

      vi.mocked(googleSheetsUtils.syncToGoogleSheets).mockReturnValue(syncPromise);

      renderWithProviders(<GoogleSheetsSync applications={mockApplications} />);
      
      const syncButton = screen.getByText('Sync Now');
      fireEvent.click(syncButton);

      await waitFor(() => {
        expect(syncButton).toBeDisabled();
        expect(syncButton).toHaveTextContent('Syncing...');
      });

      await act(async () => {
        resolveSync!({ rowsSynced: 1 });
        await syncPromise;
      });

      await waitFor(() => {
        expect(syncButton).not.toBeDisabled();
      });
    });

    test('should show error when no spreadsheet ID exists', async () => {
      delete localStorageStore['googleSheetsSpreadsheetId'];
      vi.mocked(googleSheetsUtils.getStoredSpreadsheetId).mockReturnValue(null);

      renderWithProviders(<GoogleSheetsSync applications={mockApplications} />);
      
      expect(screen.getByText('Create Sheet')).toBeInTheDocument();
    });
  });

  describe('Open Spreadsheet functionality', () => {
    beforeEach(() => {
      mockIsAuthenticated = true;
      localStorageStore['googleSheetsSpreadsheetId'] = 'test-id-123';
      vi.mocked(googleSheetsUtils.getSyncStatus).mockReturnValue({
        isSyncing: false,
        lastSyncTime: null,
        lastSyncError: null,
        spreadsheetId: 'test-id-123',
      });
      vi.mocked(googleSheetsUtils.getStoredSpreadsheetId).mockReturnValue('test-id-123');
    });

    test('should open spreadsheet URL when link is clicked', async () => {
      renderWithProviders(<GoogleSheetsSync applications={mockApplications} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Open Spreadsheet/i)).toBeInTheDocument();
      });
      
      const openLink = screen.getByText(/Open Spreadsheet/i);
      fireEvent.click(openLink);

      expect(mockWindowOpen).toHaveBeenCalledWith(
        'https://docs.google.com/spreadsheets/d/test-id-123',
        '_blank'
      );
    });
  });
});
