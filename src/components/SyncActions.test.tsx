// src/components/SyncActions.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SyncActions from './SyncActions';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

describe('SyncActions', () => {
  const defaultProps = {
    hasSpreadsheet: false,
    isLoading: false,
    isCreatingSheet: false,
    isSyncing: false,
    onCreateSheet: vi.fn(),
    onSelectExisting: vi.fn(),
    onSync: vi.fn(),
  };

  it('renders create and select buttons when no spreadsheet', () => {
    render(<SyncActions {...defaultProps} />);
    expect(screen.getByText('sheets.createSheet')).toBeTruthy();
    expect(screen.getByText('sheets.selectExisting')).toBeTruthy();
  });

  it('renders sync button when spreadsheet exists', () => {
    render(<SyncActions {...defaultProps} hasSpreadsheet={true} />);
    expect(screen.getByText('sheets.syncNow')).toBeTruthy();
  });

  it('calls onCreateSheet when create button clicked', () => {
    const onCreateSheet = vi.fn();
    render(<SyncActions {...defaultProps} onCreateSheet={onCreateSheet} />);
    fireEvent.click(screen.getByText('sheets.createSheet'));
    expect(onCreateSheet).toHaveBeenCalledTimes(1);
  });

  it('disables buttons when loading', () => {
    render(<SyncActions {...defaultProps} isLoading={true} />);
    expect(screen.getByText('sheets.createSheet').closest('button')?.disabled).toBe(true);
  });

  it('shows creating text when isCreatingSheet', () => {
    render(<SyncActions {...defaultProps} isCreatingSheet={true} />);
    expect(screen.getByText('sheets.creating')).toBeTruthy();
  });

  it('shows syncing text when isSyncing', () => {
    render(<SyncActions {...defaultProps} hasSpreadsheet={true} isSyncing={true} />);
    expect(screen.getByText('sheets.syncing')).toBeTruthy();
  });
});
