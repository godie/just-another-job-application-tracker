import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HomePage from '../pages/HomePage';
import { AlertProvider } from '../components/AlertProvider';
import type { JobApplication } from '../types/applications';
import type { JobOpportunity } from '../types/opportunities';

const mockApplicationsState = vi.hoisted(() => ({
  applications: [] as JobApplication[],
  loadApplications: vi.fn(),
  addApplication: vi.fn(),
  updateApplication: vi.fn(),
  deleteApplication: vi.fn(),
  refreshApplications: vi.fn(),
}));

const mockPreferencesState = vi.hoisted(() => ({
  preferences: {
    enabledFields: [],
    columnOrder: [],
    defaultView: 'table',
    dateFormat: 'MM/DD/YYYY',
    customFields: [],
    customInterviewEvents: [],
    emailScanMonths: 3,
    enabledChatbots: ['ChatGPT', 'Claude', 'Gemini'],
    atsSearch: { enabled: false, keywords: '', location: '', remoteOnly: false },
  },
  loadPreferences: vi.fn(),
}));

const mockOpportunitiesState = vi.hoisted(() => ({
  opportunities: [] as JobOpportunity[],
  loadOpportunities: vi.fn(),
}));

const mockMatchingState = vi.hoisted(() => ({
  matchResults: {} as Record<string, unknown>,
  preferences: { enabled: false, minMatchThreshold: 40 },
  profile: null,
  loadMatchingState: vi.fn(),
  computeScores: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../stores/applicationsStore', () => ({
  useApplicationsStore: Object.assign(
    (selector: (state: typeof mockApplicationsState) => unknown) => selector(mockApplicationsState),
    { getState: () => mockApplicationsState }
  ),
}));

vi.mock('../stores/preferencesStore', () => ({
  usePreferencesStore: (selector: (state: typeof mockPreferencesState) => unknown) =>
    selector(mockPreferencesState),
}));

vi.mock('../stores/opportunitiesStore', () => ({
  useOpportunitiesStore: (selector: (state: typeof mockOpportunitiesState) => unknown) =>
    selector(mockOpportunitiesState),
}));

vi.mock('../stores/matchingStore', () => ({
  useMatchingStore: (selector: (state: typeof mockMatchingState) => unknown) =>
    selector(mockMatchingState),
}));

vi.mock('../components/RecommendationPanel', () => ({
  RecommendationPanel: ({ recommendations, title }: { recommendations: unknown[]; title: string }) => (
    <div data-testid="recommendation-panel">
      {title} – {recommendations.length} items
    </div>
  ),
}));

vi.mock('../components/GoogleSheetsSync', () => ({
  default: () => <div data-testid="google-sheets-sync">GoogleSheetsSync</div>,
}));

vi.mock('../components/CSVActions', () => ({
  default: () => <div data-testid="csv-actions">CSVActions</div>,
}));

vi.mock('../components/AddJobForm', () => ({
  default: () => <div data-testid="add-job-form">AddJobForm</div>,
}));

vi.mock('../components/JobPreviewPanel', () => ({
  default: () => <div data-testid="job-preview-panel">JobPreviewPanel</div>,
}));

vi.mock('../components/Footer', () => ({
  default: ({ version }: { version: string }) => (
    <div data-testid="footer">Footer – {version}</div>
  ),
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<AlertProvider>{ui}</AlertProvider>);
};

describe('HomePage – threshold persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockApplicationsState.applications = [];
    mockOpportunitiesState.opportunities = [];
    mockMatchingState.matchResults = {};
    mockMatchingState.preferences = { enabled: false, minMatchThreshold: 40 };
    mockMatchingState.profile = null;
  });

  it('should read match threshold from localStorage on mount', () => {
    localStorage.setItem('jat_match_threshold_override_v1', '75');
    mockMatchingState.preferences = { enabled: true, minMatchThreshold: 40 };
    mockMatchingState.matchResults = {
      '1': { opportunityId: '1', overallScore: 80 },
    };
    mockOpportunitiesState.opportunities = [
      {
        id: '1',
        position: 'Software Engineer',
        company: 'Google',
        link: 'https://linkedin.com/jobs/view/123',
        capturedDate: new Date().toISOString(),
      },
    ];

    renderWithProviders(<HomePage />);

    const slider = screen.getByRole('slider') as HTMLInputElement;
    expect(slider.value).toBe('75');
  });

  it('should initialize threshold from preferences minMatchThreshold when no localStorage override', () => {
    mockMatchingState.preferences = { enabled: true, minMatchThreshold: 60 };
    mockMatchingState.matchResults = {
      '1': { opportunityId: '1', overallScore: 80 },
      '2': { opportunityId: '2', overallScore: 30 },
    };
    mockOpportunitiesState.opportunities = [
      {
        id: '1',
        position: 'Software Engineer',
        company: 'Google',
        link: 'https://linkedin.com/jobs/view/123',
        capturedDate: new Date().toISOString(),
      },
      {
        id: '2',
        position: 'Frontend Developer',
        company: 'Meta',
        link: 'https://linkedin.com/jobs/view/456',
        capturedDate: new Date().toISOString(),
      },
    ];

    renderWithProviders(<HomePage />);

    const slider = screen.getByRole('slider') as HTMLInputElement;
    expect(slider.value).toBe('60');
  });

  it('should show Reset to Default button when localStorage override exists', () => {
    localStorage.setItem('jat_match_threshold_override_v1', '75');
    mockMatchingState.preferences = { enabled: true, minMatchThreshold: 40 };
    mockMatchingState.matchResults = {
      '1': { opportunityId: '1', overallScore: 80 },
    };
    mockOpportunitiesState.opportunities = [
      {
        id: '1',
        position: 'Software Engineer',
        company: 'Google',
        link: 'https://linkedin.com/jobs/view/123',
        capturedDate: new Date().toISOString(),
      },
    ];

    renderWithProviders(<HomePage />);

    expect(screen.getByRole('button', { name: /Reset to Default/i })).toBeInTheDocument();
  });

  it('should not show Reset to Default button when no localStorage override exists', () => {
    mockMatchingState.preferences = { enabled: true, minMatchThreshold: 40 };
    mockMatchingState.matchResults = {
      '1': { opportunityId: '1', overallScore: 80 },
    };
    mockOpportunitiesState.opportunities = [
      {
        id: '1',
        position: 'Software Engineer',
        company: 'Google',
        link: 'https://linkedin.com/jobs/view/123',
        capturedDate: new Date().toISOString(),
      },
    ];

    renderWithProviders(<HomePage />);

    expect(screen.queryByRole('button', { name: /Reset to Default/i })).not.toBeInTheDocument();
  });

  it('should reset threshold to preference default when Reset to Default is clicked', () => {
    localStorage.setItem('jat_match_threshold_override_v1', '75');
    mockMatchingState.preferences = { enabled: true, minMatchThreshold: 40 };
    mockMatchingState.matchResults = {
      '1': { opportunityId: '1', overallScore: 80 },
    };
    mockOpportunitiesState.opportunities = [
      {
        id: '1',
        position: 'Software Engineer',
        company: 'Google',
        link: 'https://linkedin.com/jobs/view/123',
        capturedDate: new Date().toISOString(),
      },
    ];

    renderWithProviders(<HomePage />);

    const slider = screen.getByRole('slider') as HTMLInputElement;
    expect(slider.value).toBe('75');

    const resetButton = screen.getByRole('button', { name: /Reset to Default/i });
    fireEvent.click(resetButton);

    expect(slider.value).toBe('40');
    expect(localStorage.getItem('jat_match_threshold_override_v1')).toBeNull();
  });

  it('should save match threshold to localStorage only when user changes it', () => {
    mockMatchingState.preferences = { enabled: true, minMatchThreshold: 0 };
    mockMatchingState.matchResults = {
      '1': { opportunityId: '1', overallScore: 80 },
    };
    mockOpportunitiesState.opportunities = [
      {
        id: '1',
        position: 'Software Engineer',
        company: 'Google',
        link: 'https://linkedin.com/jobs/view/123',
        capturedDate: new Date().toISOString(),
      },
    ];

    renderWithProviders(<HomePage />);

    // Initial mount should NOT save to localStorage
    expect(localStorage.getItem('jat_match_threshold_override_v1')).toBeNull();

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '60' } });

    // Only user changes should persist
    expect(localStorage.getItem('jat_match_threshold_override_v1')).toBe('60');
  });

  it('should show match threshold slider when matching is enabled and recommendations exist', () => {
    mockMatchingState.preferences = { enabled: true, minMatchThreshold: 0 };
    mockMatchingState.matchResults = {
      '1': { opportunityId: '1', overallScore: 80 },
    };
    mockOpportunitiesState.opportunities = [
      {
        id: '1',
        position: 'Software Engineer',
        company: 'Google',
        link: 'https://linkedin.com/jobs/view/123',
        capturedDate: new Date().toISOString(),
      },
    ];

    renderWithProviders(<HomePage />);

    expect(screen.getByRole('slider')).toBeInTheDocument();
    expect(screen.getByTestId('recommendation-panel')).toBeInTheDocument();
  });

  it('should not show match threshold slider when matching is disabled', () => {
    mockMatchingState.preferences = { enabled: false, minMatchThreshold: 40 };
    mockOpportunitiesState.opportunities = [
      {
        id: '1',
        position: 'Software Engineer',
        company: 'Google',
        link: 'https://linkedin.com/jobs/view/123',
        capturedDate: new Date().toISOString(),
      },
    ];

    renderWithProviders(<HomePage />);

    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(screen.queryByTestId('recommendation-panel')).not.toBeInTheDocument();
  });

  it('should filter recommendations by match threshold', () => {
    mockMatchingState.preferences = { enabled: true, minMatchThreshold: 0 };
    mockMatchingState.matchResults = {
      '1': { opportunityId: '1', overallScore: 80 },
      '2': { opportunityId: '2', overallScore: 30 },
    };
    mockOpportunitiesState.opportunities = [
      {
        id: '1',
        position: 'Software Engineer',
        company: 'Google',
        link: 'https://linkedin.com/jobs/view/123',
        capturedDate: new Date().toISOString(),
      },
      {
        id: '2',
        position: 'Frontend Developer',
        company: 'Meta',
        link: 'https://linkedin.com/jobs/view/456',
        capturedDate: new Date().toISOString(),
      },
    ];

    renderWithProviders(<HomePage />);

    expect(screen.getByText(/– 2 items/)).toBeInTheDocument();

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '50' } });

    expect(screen.getByText(/– 1 items/)).toBeInTheDocument();
  });

  it('should show empty state when no recommendations match the threshold', () => {
    mockMatchingState.preferences = { enabled: true, minMatchThreshold: 0 };
    mockMatchingState.matchResults = {
      '1': { opportunityId: '1', overallScore: 30 },
    };
    mockOpportunitiesState.opportunities = [
      {
        id: '1',
        position: 'Software Engineer',
        company: 'Google',
        link: 'https://linkedin.com/jobs/view/123',
        capturedDate: new Date().toISOString(),
      },
    ];

    renderWithProviders(<HomePage />);

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '50' } });

    expect(screen.queryByTestId('recommendation-panel')).not.toBeInTheDocument();
    expect(screen.getByText(/No opportunities match the current threshold/i)).toBeInTheDocument();
  });

  it('should sync threshold from preferences when they load after mount (no override)', async () => {
    mockMatchingState.preferences = { enabled: true, minMatchThreshold: 40 };
    mockMatchingState.matchResults = {
      '1': { opportunityId: '1', overallScore: 80 },
    };
    mockOpportunitiesState.opportunities = [
      {
        id: '1',
        position: 'Software Engineer',
        company: 'Google',
        link: 'https://linkedin.com/jobs/view/123',
        capturedDate: new Date().toISOString(),
      },
    ];

    const { rerender } = renderWithProviders(<HomePage />);

    const slider = screen.getByRole('slider') as HTMLInputElement;
    expect(slider.value).toBe('40');

    // Simulate preferences loading from storage after mount
    mockMatchingState.preferences = { enabled: true, minMatchThreshold: 60 };
    rerender(<AlertProvider><HomePage /></AlertProvider>);

    await waitFor(() => {
      expect(slider.value).toBe('60');
    });
  });

  it('should not sync threshold when localStorage override exists', async () => {
    localStorage.setItem('jat_match_threshold_override_v1', '75');
    mockMatchingState.preferences = { enabled: true, minMatchThreshold: 40 };
    mockMatchingState.matchResults = {
      '1': { opportunityId: '1', overallScore: 80 },
    };
    mockOpportunitiesState.opportunities = [
      {
        id: '1',
        position: 'Software Engineer',
        company: 'Google',
        link: 'https://linkedin.com/jobs/view/123',
        capturedDate: new Date().toISOString(),
      },
    ];

    const { rerender } = renderWithProviders(<HomePage />);

    const slider = screen.getByRole('slider') as HTMLInputElement;
    expect(slider.value).toBe('75');

    // Preferences load but override should win
    mockMatchingState.preferences = { enabled: true, minMatchThreshold: 60 };
    rerender(<AlertProvider><HomePage /></AlertProvider>);

    // localStorage override takes precedence; value stays 75
    await waitFor(() => {
      expect(slider.value).toBe('75');
    });
  });

  it('should show setup matching CTA when matching is disabled and no profile', () => {
    mockMatchingState.preferences = { enabled: false, minMatchThreshold: 40 };
    mockMatchingState.profile = null;
    mockOpportunitiesState.opportunities = [
      {
        id: '1',
        position: 'Software Engineer',
        company: 'Google',
        link: 'https://linkedin.com/jobs/view/123',
        capturedDate: new Date().toISOString(),
      },
    ];

    const onNavigate = vi.fn();
    renderWithProviders(<HomePage onNavigate={onNavigate} />);

    expect(screen.getByText(/AI Job Matching/i)).toBeInTheDocument();
    expect(screen.getByText(/Set Up Matching/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Set Up Matching/i));
    expect(onNavigate).toHaveBeenCalledWith('settings');
  });
});
