import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BackupSyncPage from '../pages/BackupSyncPage';
import { useAuthStore } from '../stores/authStore';
import { useMergeStore } from '../stores/mergeStore';
import { createConflictData } from './helpers/mergeDataHelpers';

vi.mock('@react-oauth/google', () => ({
  useGoogleLogin: (opts: { onSuccess?: (res: { code: string }) => void; onError?: () => void }) => {
    return () => opts.onSuccess?.({ code: 'mock-auth-code' });
  },
}));

describe('BackupSyncPage - Merge', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isAuthenticated: false });
    useMergeStore.getState().clearConflict();
  });

  it('does not show merge banner when no conflict', () => {
    useAuthStore.setState({
      user: { id: 1, email: 'test@test.com' },
      isAuthenticated: true,
    });
    render(<BackupSyncPage />);
    expect(screen.queryByText('Data not synced — choose how to handle your data')).toBeNull();
  });

  it('shows merge banner when conflict is detected', () => {
    useAuthStore.setState({
      user: { id: 1, email: 'test@test.com' },
      isAuthenticated: true,
    });
    const { localData, cloudData } = createConflictData();
    useMergeStore.getState().setConflict(localData, cloudData);
    render(<BackupSyncPage />);
    expect(screen.getByText('Data not synced — choose how to handle your data')).toBeTruthy();
  });
});
