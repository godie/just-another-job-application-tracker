// src/components/SyncStatusInfo.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SyncStatusInfo from './SyncStatusInfo';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts?.time) return `${key} ${opts.time}`;
      return key;
    },
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

// Mock formatLastSyncTime to return a predictable value
vi.mock('../utils/googleSheets', () => ({
  formatLastSyncTime: () => '15/1/2024',
}));

describe('SyncStatusInfo', () => {
  const defaultProps = {
    hasSpreadsheet: false,
    syncStatus: { lastSyncTime: null, lastSyncError: null },
    spreadsheetUrl: null,
    onOpenSheet: vi.fn(),
    onChangeSheet: vi.fn(),
  };

  it('renders description when no spreadsheet', () => {
    render(<SyncStatusInfo {...defaultProps} />);
    expect(screen.getByText('sheets.createSheetDesc')).toBeTruthy();
  });

  it('renders synced status when spreadsheet exists and synced', () => {
    render(
      <SyncStatusInfo
        {...defaultProps}
        hasSpreadsheet={true}
        syncStatus={{ lastSyncTime: '2024-01-15T10:00:00Z', lastSyncError: null }}
        spreadsheetUrl="https://docs.google.com/spreadsheets/d/test"
      />
    );
    expect(screen.getByText('sheets.openSheet')).toBeTruthy();
  });

  it('renders error status when sync has error', () => {
    render(
      <SyncStatusInfo
        {...defaultProps}
        hasSpreadsheet={true}
        syncStatus={{ lastSyncTime: null, lastSyncError: 'Something went wrong' }}
        spreadsheetUrl="https://docs.google.com/spreadsheets/d/test"
      />
    );
    expect(screen.getByText(/Something went wrong/)).toBeTruthy();
  });

  it('renders not synced when no lastSyncTime and no error', () => {
    render(
      <SyncStatusInfo
        {...defaultProps}
        hasSpreadsheet={true}
        syncStatus={{ lastSyncTime: null, lastSyncError: null }}
        spreadsheetUrl={null}
      />
    );
    expect(screen.getByText('sheets.notSynced')).toBeTruthy();
  });
});
