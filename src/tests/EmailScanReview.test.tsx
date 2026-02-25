import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EmailScanReview } from '../components/EmailScanReview';
import { AlertProvider } from '../components/AlertProvider';

const mockScan = vi.fn();
const mockApplySelected = vi.fn();
const mockClearPreview = vi.fn();

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
  });

  it('renders title and subtitle', () => {
    renderWithAlert();
    expect(screen.getByText(/Scan Gmail for Applications/i)).toBeInTheDocument();
    expect(screen.getByText(/Find confirmations, rejections and next steps in your Gmail to automate your tracker/i)).toBeInTheDocument();
  });

  it('renders Scan Gmail button', () => {
    renderWithAlert();
    expect(screen.getByRole('button', { name: /Scan Gmail/i })).toBeInTheDocument();
  });

  it('calls scan when Scan Gmail is clicked', async () => {
    mockScan.mockResolvedValue(undefined);
    renderWithAlert();
    fireEvent.click(screen.getByRole('button', { name: /Scan Gmail/i }));
    await waitFor(() => {
      expect(mockScan).toHaveBeenCalled();
    });
  });
});
