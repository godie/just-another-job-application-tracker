import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ConnectGoogleButton } from '../components/ConnectGoogleButton';
import { useGoogleLogin } from '@react-oauth/google';

// Mock linkGoogleAccount
vi.mock('../utils/api', () => ({
  linkGoogleAccount: vi.fn(),
}));

// Mock authStore
const mockFetchMe = vi.fn();
vi.mock('../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

// Mock AlertProvider
const mockShowSuccess = vi.fn();
const mockShowError = vi.fn();
vi.mock('../components/AlertProvider', () => ({
  useAlert: () => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
    alerts: [],
    removeAlert: vi.fn(),
  }),
}));

import { linkGoogleAccount } from '../utils/api';
import { useAuthStore } from '../stores/authStore';

const mockedLinkGoogleAccount = vi.mocked(linkGoogleAccount);
const mockedUseAuthStore = vi.mocked(useAuthStore);
const mockedUseGoogleLogin = vi.mocked(useGoogleLogin);

describe('ConnectGoogleButton', () => {
  const mockGoogleLoginFn = vi.fn();

  const getOAuthConfig = () => {
    const calls = mockedUseGoogleLogin.mock.calls;
    return calls[calls.length - 1]?.[0] as
      | { onSuccess?: (cr: { code: string }) => void; onError?: () => void }
      | undefined;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchMe.mockResolvedValue(undefined);
    mockedUseGoogleLogin.mockReturnValue(mockGoogleLoginFn);
    mockedUseAuthStore.mockReturnValue({
      currentUser: { id: 1, email: 'test@example.com', role: 'member', isPublic: false },
      isAuthenticated: true,
      isLoading: false,
      error: null,
      fetchMe: mockFetchMe,
      setUser: vi.fn(),
      setError: vi.fn(),
      setLoading: vi.fn(),
      login: vi.fn(),
      register: vi.fn(),
      loginWithGoogle: vi.fn(),
      loginWithLinkedIn: vi.fn(),
      logout: vi.fn(),
    } as unknown as ReturnType<typeof useAuthStore>);
  });

  it('renders with type="button", aria-label, and Google SVG when not in progress', () => {
    render(<ConnectGoogleButton />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveAttribute('aria-label');
    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'false');

    const svg = button.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
  });

  it('calls googleLogin on click', async () => {
    const user = userEvent.setup();
    render(<ConnectGoogleButton />);

    await user.click(screen.getByRole('button'));

    expect(mockGoogleLoginFn).toHaveBeenCalledTimes(1);
  });

  it('shows spinner and disables button while linking', async () => {
    // Never resolve — keeps isLinking=true
    mockedLinkGoogleAccount.mockImplementation(
      () => new Promise(() => {})
    );

    render(<ConnectGoogleButton />);

    const config = getOAuthConfig();
    if (config?.onSuccess) {
      config.onSuccess({ code: 'test-auth-code' });
    }

    await waitFor(() => {
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-busy', 'true');
    });

    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeTruthy();
  });

  it('calls fetchMe and showSuccess on successful linking', async () => {
    mockedLinkGoogleAccount.mockResolvedValue({
      success: true,
      message: 'Google account linked successfully',
    });

    render(<ConnectGoogleButton />);

    const config = getOAuthConfig();
    if (config?.onSuccess) {
      await config.onSuccess({ code: 'test-auth-code' });
    }

    expect(mockedLinkGoogleAccount).toHaveBeenCalledWith('test-auth-code');

    await waitFor(() => {
      expect(mockFetchMe).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(mockShowSuccess).toHaveBeenCalledWith(
        'Google account linked successfully!'
      );
    });

    // Button should be re-enabled after success
    await waitFor(() => {
      expect(screen.getByRole('button')).not.toBeDisabled();
      expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'false');
    });
  });

  it('calls showError with backend message and re-enables button on failure', async () => {
    mockedLinkGoogleAccount.mockResolvedValue({
      success: false,
      error: 'Custom backend error',
    });

    render(<ConnectGoogleButton />);

    const config = getOAuthConfig();
    if (config?.onSuccess) {
      await config.onSuccess({ code: 'test-auth-code' });
    }

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Custom backend error');
    });

    // Button re-enabled after error
    await waitFor(() => {
      expect(screen.getByRole('button')).not.toBeDisabled();
      expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'false');
    });
  });

  it('calls showError with network error message on fetch failure', async () => {
    mockedLinkGoogleAccount.mockRejectedValue(new Error('Network error'));

    render(<ConnectGoogleButton />);

    const config = getOAuthConfig();
    if (config?.onSuccess) {
      await config.onSuccess({ code: 'test-auth-code' });
    }

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        'Connection error. Please try again.'
      );
    });
  });

  it('calls showError with fallback when backend returns no error message', async () => {
    mockedLinkGoogleAccount.mockResolvedValue({
      success: false,
      error: undefined,
    });

    render(<ConnectGoogleButton />);

    const config = getOAuthConfig();
    if (config?.onSuccess) {
      await config.onSuccess({ code: 'test-auth-code' });
    }

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        'Could not link Google account'
      );
    });
  });

  it('calls showError with OAuth message on onError', () => {
    render(<ConnectGoogleButton />);

    const config = getOAuthConfig();
    if (config?.onError) {
      config.onError();
    }

    expect(mockShowError).toHaveBeenCalledWith(
      'Error connecting to Google. Please try again.'
    );
  });
});
