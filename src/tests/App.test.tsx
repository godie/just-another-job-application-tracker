// src/tests/App.test.tsx
import { render, screen, act, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import App from '../App';
import type { JobApplication } from '../types/applications';

// Mock auth store to prevent unhandled rejections from fetchMe -> setLoginStatus
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

// Mock applications store so we can seed test data for the job-details page
vi.mock('../stores/applicationsStore', () => ({
  useApplicationsStore: vi.fn(),
}));

import { useApplicationsStore } from '../stores/applicationsStore';

// Default mock state — safe defaults for all tests. Individual tests override.
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

// Mock components that might be problematic in test environment
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
    // Reset URL to base
    window.history.replaceState({}, '', '/');
    // Reset applications store to safe defaults
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
    // Set up URL with page parameter
    const url = new URL(window.location.href);
    url.searchParams.set('page', 'settings');
    window.history.replaceState({}, '', url.toString());

    render(<App />);

    // In SettingsPage, we expect the h1 heading 'Settings'
    // Using level:1 to avoid matching h3 category labels that may contain 'settings' in raw i18n keys
    // Wait for lazy-loaded SettingsPage to resolve
    expect(await screen.findByRole('heading', { level: 1, name: /Settings/i })).toBeInTheDocument();
  });

  it('updates the URL when the page changes', async () => {
    render(<App />);

    // Initially on landing
    expect(window.location.search).toContain('page=landing');
  });

  it('renders job-details page with correct application data from URL', async () => {
    // Seed a test application in the store
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

    // Set URL with job-details page and jobId
    const url = new URL(window.location.href);
    url.searchParams.set('page', 'job-details');
    url.searchParams.set('jobId', 'app-1');
    window.history.replaceState({}, '', url.toString());

    render(<App />);

    // Wait for lazy-loaded JobDetailsPage to resolve — use heading role to avoid
    // matching duplicate text in both <h1> and detail grid <dd>
    expect(await screen.findByRole('heading', { name: /Senior Backend Engineer/ })).toBeInTheDocument();
    // Company appears in subtitle <p> and detail grid — use getAllByText
    const companyTexts = screen.getAllByText('Widgets Inc');
    expect(companyTexts.length).toBe(2);
    // Status badge
    expect(screen.getByText('interviewing')).toBeInTheDocument();
    // Job ID in header
    expect(screen.getByText('app-1')).toBeInTheDocument();
    // SEO title
    expect(document.title).toBe(
      'Senior Backend Engineer at Widgets Inc - My Applications | JAJAT'
    );

    // Verify full navigation flow: click "Back to Applications"
    const backButtons = screen.getAllByText(/Back to Applications/);
    fireEvent.click(backButtons[0]);
    // After navigation, App should update the URL
    expect(window.location.search).toContain('page=applications');
  });

  it('updates the page when the popstate event occurs', async () => {
    render(<App />);

    // Simulate navigation to settings via URL change and popstate
    const url = new URL(window.location.href);
    url.searchParams.set('page', 'settings');
    window.history.pushState({ page: 'settings' }, '', url.toString());

    await act(async () => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: { page: 'settings' } }));
    });

    // Check if it navigated to settings (use level:1 to match only the page title h1)
    // Wait for lazy-loaded SettingsPage to resolve
    expect(await screen.findByRole('heading', { level: 1, name: /Settings/i })).toBeInTheDocument();
  });
});