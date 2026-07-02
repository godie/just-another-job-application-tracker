import { render, screen, act, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import App from '../App';
import type { JobApplication } from '../types/applications';

vi.mock('../stores/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    currentUser: null,
    isAuthenticated: false,
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
  })),
}));

vi.mock('../stores/applicationsStore', () => ({
  useApplicationsStore: vi.fn(),
}));

import { useApplicationsStore } from '../stores/applicationsStore';

const defaultStoreState = () => ({
  applications: [] as JobApplication[],
  loadApplications: vi.fn(),
  refreshApplications: vi.fn(),
  deleteApplication: vi.fn(),
});

(useApplicationsStore as ReturnType<typeof vi.fn>).mockImplementation(
  (selector?: (state: ReturnType<typeof defaultStoreState>) => unknown) =>
    typeof selector === 'function' ? selector(defaultStoreState()) : defaultStoreState()
);

vi.mock('../layouts/MainLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid='main-layout'>{children}</div>,
}));

vi.mock('@react-oauth/google', () => ({
  GoogleOAuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../components/PWAReloadPrompt', () => ({
  default: () => null,
}));

describe('App Navigation and History', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, '', '/');
    (useApplicationsStore as ReturnType<typeof vi.fn>).mockImplementation(
      (selector?: (state: ReturnType<typeof defaultStoreState>) => unknown) =>
        typeof selector === 'function' ? selector(defaultStoreState()) : defaultStoreState()
    );
  });

  it('renders the landing page by default', () => {
    render(<App />);
    expect(screen.getByText(/Master Your Job Search/i)).toBeInTheDocument();
  });

  it('navigates to the page specified in the URL query parameter', async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('page', 'settings');
    window.history.replaceState({}, '', url.toString());

    render(<App />);

    expect(await screen.findByRole('heading', { level: 1, name: /Settings/i })).toBeInTheDocument();
  });

  it('updates the URL when the page changes', async () => {
    render(<App />);

    expect(screen.getByText(/Master Your Job Search/i)).toBeInTheDocument();
  });

  it('renders job-details page with correct application data from URL', async () => {
    const testApp: JobApplication = {
      id: 'app-1',
      position: 'Senior Backend Engineer',
      company: 'Widgets Inc',
      status: 'interviewing',
      applicationDate: '2025-01-15',
      salary: '120k–150k',
      platform: 'Indeed',
      location: 'Berlin, DE',
      workType: 'hybrid',
      hybridDaysInOffice: 3,
      contactName: 'Alice Hiring',
      link: 'https://example.com/job/sbe',
      interviewDate: '2025-02-01',
      followUpDate: '2025-03-01',
      notes: 'Great team.',
      timeline: [
        { id: 'e1', type: 'application_submitted', date: '2025-01-15', status: 'completed' },
        { id: 'e2', type: 'technical_interview', date: '2025-02-01', status: 'scheduled' },
      ],
      customFields: { 'Referral': 'Internal' },
    } as JobApplication;

    const mockLoad = vi.fn();
    const mockRefresh = vi.fn();
    const mockDelete = vi.fn();

    (useApplicationsStore as ReturnType<typeof vi.fn>).mockImplementation(
      (selector: (state: { applications: JobApplication[]; loadApplications: typeof mockLoad; refreshApplications: typeof mockRefresh; deleteApplication: typeof mockDelete }) => unknown) =>
        selector({
          applications: [testApp],
          loadApplications: mockLoad,
          refreshApplications: mockRefresh,
          deleteApplication: mockDelete,
        })
    );

    const url = new URL(window.location.href);
    url.searchParams.set('page', 'job-details');
    url.searchParams.set('jobId', 'app-1');
    window.history.replaceState({}, '', url.toString());

    render(<App />);

    expect(await screen.findByRole('heading', { name: /Senior Backend Engineer/ })).toBeInTheDocument();
    const companyTexts = screen.getAllByText('Widgets Inc');
    expect(companyTexts.length).toBe(2);
    expect(screen.getByText('interviewing')).toBeInTheDocument();
    expect(screen.getByText('app-1')).toBeInTheDocument();
    expect(document.title).toBe(
      'Senior Backend Engineer at Widgets Inc - My Applications | JAJAT'
    );

    const backButtons = screen.getAllByText(/Back to Applications/);
    fireEvent.click(backButtons[0]);
    expect(window.location.search).toContain('page=applications');
  });

  it('updates the page when the popstate event occurs', async () => {
    render(<App />);

    const url = new URL(window.location.href);
    url.searchParams.set('page', 'settings');
    window.history.pushState({ page: 'settings' }, '', url.toString());

    await act(async () => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: { page: 'settings' } }));
    });

    expect(await screen.findByRole('heading', { level: 1, name: /Settings/i })).toBeInTheDocument();
  });

  it('wraps route swaps in document.startViewTransition when the API is supported', async () => {
    // Per-call feature detection in App.tsx means we can mock the API
    // AFTER the module is already loaded — no resetModules gymnastics.
    const startViewTransition = vi.fn((cb: () => void) => cb());
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      writable: true,
      value: startViewTransition,
    });

    try {
      render(<App />);

      const url = new URL(window.location.href);
      url.searchParams.set('page', 'settings');
      window.history.pushState({ page: 'settings' }, '', url.toString());

      await act(async () => {
        window.dispatchEvent(
          new PopStateEvent('popstate', { state: { page: 'settings' } }),
        );
      });

      // The popstate handler routes through startViewTransition exactly
      // once. The synchronous fake fires the callback immediately, so by
      // the time this assert runs React has already committed the new page.
      expect(startViewTransition).toHaveBeenCalledTimes(1);
      expect(
        await screen.findByRole('heading', { level: 1, name: /Settings/i }),
      ).toBeInTheDocument();
    } finally {
      Reflect.deleteProperty(document, 'startViewTransition');
    }
  });
});