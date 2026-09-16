import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { ConnectGoogleButton } from './ConnectGoogleButton';

vi.mock('../utils/api', () => ({
  linkGoogleAccount: vi.fn(),
  setAuthCookieWithCode: vi.fn(),
}));

const mockFetchMe = vi.fn();
vi.mock('../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

const mockShowSuccess = vi.fn();
const mockShowError = vi.fn();
vi.mock('./AlertProvider', () => ({
  useAlert: () => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
    alerts: [],
    removeAlert: vi.fn(),
  }),
}));

import { linkGoogleAccount, setAuthCookieWithCode } from '../utils/api';
import { useAuthStore } from '../stores/authStore';

const mockedLinkGoogleAccount = vi.mocked(linkGoogleAccount);
const mockedSetAuthCookieWithCode = vi.mocked(setAuthCookieWithCode);
const mockedUseAuthStore = vi.mocked(useAuthStore);
const mockedUseGoogleLogin = vi.mocked(useGoogleLogin);

describe('ConnectGoogleButton', () => {
  const mockGoogleLoginFn = vi.fn();

  const getOAuthConfig = () => {
    const calls = mockedUseGoogleLogin.mock.calls;
    return calls[calls.length - 1]?.[0] as
      | { onSuccess?: (cr: { code: string }) => void; onError?: () => void; scope?: string }
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

  it('renders default label when no custom label is provided', () => {
    render(<ConnectGoogleButton />);

    expect(screen.getByText('Link Google account')).toBeInTheDocument();
  });

  it('renders custom label when label prop is provided', () => {
    render(<ConnectGoogleButton label="Connect My Google" />);

    expect(screen.getByText('Connect My Google')).toBeInTheDocument();
    expect(screen.queryByText('Link Google account')).not.toBeInTheDocument();
  });

  it('applies default className when none is provided', () => {
    render(<ConnectGoogleButton />);

    const button = screen.getByRole('button');
    expect(button.className).toContain('border-primary/20');
  });

  it('applies custom className when provided', () => {
    render(<ConnectGoogleButton className="my-custom-class" />);

    const button = screen.getByRole('button');
    expect(button.className).toContain('my-custom-class');
  });


  it('calls googleLogin on click', async () => {
    const user = userEvent.setup();
    render(<ConnectGoogleButton />);

    await user.click(screen.getByRole('button'));

    expect(mockGoogleLoginFn).toHaveBeenCalledTimes(1);
  });

  it('shows spinner and disables button while linking', async () => {
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

  it('shows "Linking..." text while linking', async () => {
    mockedLinkGoogleAccount.mockImplementation(
      () => new Promise(() => {})
    );

    render(<ConnectGoogleButton />);

    const config = getOAuthConfig();
    if (config?.onSuccess) {
      config.onSuccess({ code: 'test-auth-code' });
    }

    await waitFor(() => {
      expect(screen.getByText('Linking...')).toBeInTheDocument();
    });
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

    expect(mockedLinkGoogleAccount).toHaveBeenCalledWith('test-auth-code', expect.any(String));

    await waitFor(() => {
      expect(mockFetchMe).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(mockShowSuccess).toHaveBeenCalledWith(
        'Google account linked successfully!'
      );
    });

    await waitFor(() => {
      expect(screen.getByRole('button')).not.toBeDisabled();
      expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'false');
    });
  });

  it('calls onSuccess callback after successful linking', async () => {
    const onSuccess = vi.fn();
    mockedLinkGoogleAccount.mockResolvedValue({
      success: true,
      message: 'Google account linked successfully',
    });

    render(<ConnectGoogleButton onSuccess={onSuccess} />);

    const config = getOAuthConfig();
    if (config?.onSuccess) {
      await config.onSuccess({ code: 'test-auth-code' });
    }

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    expect(mockFetchMe.mock.invocationCallOrder[0]).toBeLessThan(
      onSuccess.mock.invocationCallOrder[0]
    );
  });


  it('calls showError with backend message and re-enables button on failure', async () => {
    const onError = vi.fn();
    mockedLinkGoogleAccount.mockResolvedValue({
      success: false,
      error: 'Custom backend error',
    });

    render(<ConnectGoogleButton onError={onError} />);

    const config = getOAuthConfig();
    if (config?.onSuccess) {
      await config.onSuccess({ code: 'test-auth-code' });
    }

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Custom backend error');
      expect(onError).toHaveBeenCalledWith('Custom backend error');
    });

    await waitFor(() => {
      expect(screen.getByRole('button')).not.toBeDisabled();
      expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'false');
    });
  });

  it('calls showError with network error message on fetch failure', async () => {
    const onError = vi.fn();
    mockedLinkGoogleAccount.mockRejectedValue(new Error('Network error'));

    render(<ConnectGoogleButton onError={onError} />);

    const config = getOAuthConfig();
    if (config?.onSuccess) {
      await config.onSuccess({ code: 'test-auth-code' });
    }

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        'Connection error. Please try again.'
      );
      expect(onError).toHaveBeenCalledWith(
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
    const onError = vi.fn();
    render(<ConnectGoogleButton onError={onError} />);

    const config = getOAuthConfig();
    if (config?.onError) {
      config.onError();
    }

    expect(mockShowError).toHaveBeenCalledWith(
      'Error connecting to Google. Please try again.'
    );
    expect(onError).toHaveBeenCalledWith(
      'Error connecting to Google. Please try again.'
    );
  });

  describe('purpose="data"', () => {
    it('requests only the basic scopes in identity mode', () => {
      render(<ConnectGoogleButton />);

      expect(getOAuthConfig()?.scope).toBe('');
    });

    it('requests Gmail and Sheets scopes', () => {
      render(<ConnectGoogleButton purpose="data" />);

      const scope = getOAuthConfig()?.scope ?? '';
      expect(scope).toContain('https://www.googleapis.com/auth/gmail.readonly');
      expect(scope).toContain('https://www.googleapis.com/auth/spreadsheets');
    });

    it('stores the auth cookie and calls onSuccess without linking identity', async () => {
      const onSuccess = vi.fn();
      mockedSetAuthCookieWithCode.mockResolvedValue({ success: true });

      render(<ConnectGoogleButton purpose="data" onSuccess={onSuccess} />);

      const config = getOAuthConfig();
      if (config?.onSuccess) {
        await config.onSuccess({ code: 'data-auth-code' });
      }

      expect(mockedSetAuthCookieWithCode).toHaveBeenCalledWith(
        'data-auth-code',
        expect.any(String)
      );
      expect(mockedLinkGoogleAccount).not.toHaveBeenCalled();
      expect(mockFetchMe).not.toHaveBeenCalled();

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
        expect(mockShowSuccess).toHaveBeenCalledWith('Google access granted!');
      });
    });

    it('reports the backend error without calling onSuccess', async () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();
      mockedSetAuthCookieWithCode.mockResolvedValue({
        success: false,
        error: 'Google OAuth not configured',
      });

      render(
        <ConnectGoogleButton purpose="data" onSuccess={onSuccess} onError={onError} />
      );

      const config = getOAuthConfig();
      if (config?.onSuccess) {
        await config.onSuccess({ code: 'data-auth-code' });
      }

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith('Google OAuth not configured');
        expect(onError).toHaveBeenCalledWith('Google OAuth not configured');
      });
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });
});
