import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EmailScanReview } from '../components/EmailScanReview';
import { AlertProvider } from '../components/AlertProvider';

const mockScan = vi.fn();
const mockApplySelected = vi.fn();
const mockClearPreview = vi.fn();

let mockHasGoogleLinked = false;

vi.mock('../stores/authStore', () => ({
  useAuthStore: vi.fn((selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      currentUser: mockHasGoogleLinked ? { id: 1, email: 'test@example.com', googleId: 'google-123' } : { id: 1, email: 'test@example.com' },
      isAuthenticated: true,
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

vi.mock('../mails/hooks/useEmailScan', () => ({
  useEmailScan: () => ({
    scan: mockScan,
    applySelected: mockApplySelected,
    loading: false,
    applying: false,
    error: null,
    preview: null,
    clearPreview: mockClearPreview,
  }),
}));

vi.mock('../utils/api', () => ({
  getAuthCookie: vi.fn(() => Promise.resolve({ success: true, access_token: 'token' })),
}));

const renderWithAlert = () =>
  render(
    <AlertProvider>
      <EmailScanReview />
    </AlertProvider>
  );

describe('EmailScanReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasGoogleLinked = false;
  });

  describe('when Google account is not linked', () => {
    it('renders title and subtitle', async () => {
      renderWithAlert();
      expect(screen.getByText(/Scan Gmail for Applications/i)).toBeInTheDocument();
      expect(screen.getByText(/Find confirmations, rejections and next steps in your Gmail to automate your tracker/i)).toBeInTheDocument();
    });

    it('shows Google not linked banner', async () => {
      renderWithAlert();
      await waitFor(() => {
        expect(screen.getByText(/Connect your Google account to scan Gmail/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/Even if you signed up with email, you can link your Google account to enable Gmail scanning/i)).toBeInTheDocument();
    });

    it('does not show Scan Gmail button', async () => {
      renderWithAlert();
      await waitFor(() => {
        expect(screen.queryByText(/Automatic Scan/i)).not.toBeInTheDocument();
      });
      expect(screen.queryByRole('button', { name: /Scan Gmail/i })).not.toBeInTheDocument();
    });

    it('does not show tabs', async () => {
      renderWithAlert();
      await waitFor(() => {
        expect(screen.queryByText(/Automatic Scan/i)).not.toBeInTheDocument();
      });
      expect(screen.queryByText(/Metadata & Chatbot/i)).not.toBeInTheDocument();
    });
  });

  describe('when Google account is linked', () => {
    beforeEach(() => {
      mockHasGoogleLinked = true;
    });

    it('renders Scan Gmail button', async () => {
      renderWithAlert();
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Scan Gmail/i })).toBeInTheDocument();
      });
    });

    it('does not show Google not linked banner', async () => {
      renderWithAlert();
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Scan Gmail/i })).toBeInTheDocument();
      });
      expect(screen.queryByText(/Connect your Google account to scan Gmail/i)).not.toBeInTheDocument();
    });

    it('shows the Automatic and Manual tabs', async () => {
      renderWithAlert();
      await waitFor(() => {
        expect(screen.getByText(/Automatic Scan/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/Metadata & Chatbot/i)).toBeInTheDocument();
    });

    it('calls scan when Scan Gmail is clicked', async () => {
      mockScan.mockResolvedValue(undefined);
      renderWithAlert();
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Scan Gmail/i })).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: /Scan Gmail/i }));
      await waitFor(() => {
        expect(mockScan).toHaveBeenCalled();
      });
    });
  });
});
