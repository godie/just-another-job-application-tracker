import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import { render, cleanup } from '@testing-library/react';
import React from 'react';
import { ConnectGoogleButton } from '../components/ConnectGoogleButton';
import { useGoogleLogin } from '@react-oauth/google';

vi.mock('../utils/api', () => ({
  linkGoogleAccount: vi.fn(),
}));

vi.mock('../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

const mockShowError = vi.fn();
vi.mock('../components/AlertProvider', () => ({
  useAlert: () => ({
    showSuccess: vi.fn(),
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

const getOAuthConfig = () => {
  const calls = mockedUseGoogleLogin.mock.calls;
  return calls[calls.length - 1]?.[0] as
    | { onSuccess?: (cr: { code: string }) => void; onError?: () => void }
    | undefined;
};

const ConditionalGoogleButton: React.FC<{ googleId?: string | null }> = ({
  googleId,
}) => {
  if (!googleId) {
    return <ConnectGoogleButton />;
  }
  return <p>Google connected</p>;
};

describe('ConnectGoogleButton — property tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseGoogleLogin.mockReturnValue(vi.fn());
    mockedUseAuthStore.mockReturnValue({
      currentUser: { id: 1, email: 'test@test.com', role: 'member', isPublic: false },
      isAuthenticated: true,
      isLoading: false,
      error: null,
      fetchMe: vi.fn(),
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

  it(
    'Property: button visibility is a function of googleId (numRuns=100)',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(fc.constant(null), fc.constant(undefined)),
          async (googleId) => {
            const { container } = render(
              <ConditionalGoogleButton googleId={googleId} />
            );
            const button = container.querySelector('button');
            expect(button).toBeTruthy();
            cleanup();
          }
        ),
        { numRuns: 100 }
      );

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          async (googleId) => {
            const { container } = render(
              <ConditionalGoogleButton googleId={googleId} />
            );
            const button = container.querySelector('button');
            expect(button).toBeNull();
            expect(container.querySelector('p')).toHaveTextContent('Google connected');
            cleanup();
          }
        ),
        { numRuns: 100 }
      );
    },
    20000
  );

  it(
    'Property: component propagates any backend error message to showError (numRuns=100)',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }),
          async (errorMessage) => {
            mockShowError.mockClear();
            mockedLinkGoogleAccount.mockClear();
            mockedLinkGoogleAccount.mockResolvedValue({
              success: false,
              error: errorMessage,
            });

            render(<ConnectGoogleButton />);

            const config = getOAuthConfig();
            if (config?.onSuccess) {
              await config.onSuccess({ code: 'prop-test-code' });
            }

            try {
              await vi.waitFor(
                () => {
                  expect(mockShowError).toHaveBeenCalledWith(errorMessage);
                },
                { timeout: 2000 }
              );
            } finally {
              cleanup();
            }
          }
        ),
        { numRuns: 100 }
      );
    },
    30000
  );
});
