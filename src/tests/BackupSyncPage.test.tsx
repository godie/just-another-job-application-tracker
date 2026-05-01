// src/tests/BackupSyncPage.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BackupSyncPage from '../pages/BackupSyncPage';
import { useAuthStore } from '../stores/authStore';
import { useMergeStore } from '../stores/mergeStore';

// Mock GoogleOAuth
vi.mock('@react-oauth/google', () => ({
  useGoogleLogin: (opts: { onSuccess?: (res: { code: string }) => void; onError?: () => void }) => {
    return () => opts.onSuccess?.({ code: 'mock-auth-code' });
  },
}));

describe('BackupSyncPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isAuthenticated: false });
    useMergeStore.getState().clearConflict();
  });

  it('renders not logged in view when unauthenticated', () => {
    render(<BackupSyncPage />);
    expect(screen.getByText('Sync Across Devices')).toBeTruthy();
  });

  it('renders logged in view when authenticated', () => {
    useAuthStore.setState({
      user: { id: 1, email: 'test@test.com' },
      isAuthenticated: true,
    });
    render(<BackupSyncPage />);
    expect(screen.getByText('Backup & Sync')).toBeTruthy();
  });

  it('renders sync paused banner when sync is paused', () => {
    useAuthStore.setState({
      user: { id: 1, email: 'test@test.com' },
      isAuthenticated: true,
    });
    useMergeStore.getState().pauseSync();
    render(<BackupSyncPage />);
    expect(screen.getByText('Data not synced — choose how to handle your data')).toBeTruthy();
  });
});
