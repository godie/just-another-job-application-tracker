import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import OpportunitiesPage from '../pages/OpportunitiesPage';
import { AlertProvider } from '../components/AlertProvider';
import type { JobOpportunity } from '../types/opportunities';

const mockOpportunitiesState = vi.hoisted(() => ({
  opportunities: [] as JobOpportunity[],
  loadOpportunities: vi.fn(),
  addOpportunity: vi.fn(),
  deleteOpportunity: vi.fn(),
  refreshOpportunities: vi.fn(),
}));

const mockApplicationsState = vi.hoisted(() => ({
  addApplication: vi.fn(),
  applications: [],
}));

const mockConvertOpportunityToApplication = vi.hoisted(() =>
  vi.fn((opp: JobOpportunity) => ({
    id: 'app-id-1',
    position: opp.position,
    company: opp.company,
    status: 'Applied',
    applicationDate: new Date().toISOString().split('T')[0],
    timeline: [],
    notes: '',
    link: opp.link,
    platform: 'LinkedIn',
    contactName: '',
    followUpDate: '',
    salary: '',
    interviewDate: '',
  })),
);

vi.mock('../stores/opportunitiesStore', () => ({
  useOpportunitiesStore: (selector: (state: typeof mockOpportunitiesState) => unknown) =>
    selector(mockOpportunitiesState),
}));

vi.mock('../stores/applicationsStore', () => ({
  useApplicationsStore: Object.assign(
    (selector: (state: typeof mockApplicationsState) => unknown) => selector(mockApplicationsState),
    { getState: () => mockApplicationsState }
  ),
}));

const mockMatchingState = vi.hoisted(() => ({
  matchResults: {} as Record<string, unknown>,
  preferences: { enabled: false, minMatchThreshold: 40 },
  profile: null,
  loadMatchingState: vi.fn(),
  computeScores: vi.fn().mockResolvedValue(undefined),
  isComputingScores: false,
  computeError: null,
}));

vi.mock('../stores/matchingStore', () => ({
  useMatchingStore: (selector: (state: typeof mockMatchingState) => unknown) =>
    selector(mockMatchingState),
}));

vi.mock('../storage/opportunities', () => ({
  convertOpportunityToApplication: mockConvertOpportunityToApplication,
}));

vi.mock('../components/Header', () => ({
  default: () => <div data-testid="header">Header</div>,
}));

vi.mock('../components/Footer', () => ({
  default: ({ version }: { version: string }) => (
    <div data-testid="footer">Footer - {version}</div>
  ),
}));

vi.mock('../components/RecommendationPanel', () => ({
  RecommendationPanel: () => <div data-testid="recommendation-panel">RecommendationPanel</div>,
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<AlertProvider>{ui}</AlertProvider>);
};

describe('OpportunitiesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockOpportunitiesState.opportunities = [];
    mockOpportunitiesState.addOpportunity.mockImplementation((opp: Omit<JobOpportunity, 'id' | 'capturedDate'>) => ({
      ...opp,
      id: 'test-id-1',
      capturedDate: new Date().toISOString(),
    }));
    mockMatchingState.matchResults = {};
    mockMatchingState.preferences = { enabled: false, minMatchThreshold: 40 };
    mockMatchingState.profile = null;
  });

  it('should render empty state when no opportunities', () => {
    renderWithProviders(<OpportunitiesPage />);

    expect(screen.getByText('Interesting Opportunities')).toBeInTheDocument();
    expect(screen.getByText('No saved opportunities yet')).toBeInTheDocument();
    expect(screen.getByText(/Install the Chrome extension/i)).toBeInTheDocument();
  });

  it('should render add opportunity button', () => {
    renderWithProviders(<OpportunitiesPage />);

    expect(screen.getByText('Add Opportunity')).toBeInTheDocument();
  });

  it('should open form when add button is clicked', () => {
    renderWithProviders(<OpportunitiesPage />);

    const addButton = screen.getByText('Add Opportunity');
    fireEvent.click(addButton);

    expect(screen.getByText('Add New Opportunity')).toBeInTheDocument();
  });

  it('should display opportunities when available', () => {
    mockOpportunitiesState.opportunities = [
      {
        id: '1',
        position: 'Software Engineer',
        company: 'Google',
        link: 'https://linkedin.com/jobs/view/123',
        location: 'Remote',
        jobType: 'Remote',
        salary: '$120k',
        postedDate: '2024-01-15',
        capturedDate: new Date().toISOString(),
      },
    ];

    renderWithProviders(<OpportunitiesPage />);

    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('Google')).toBeInTheDocument();
    const remoteTexts = screen.getAllByText('Remote');
    expect(remoteTexts.length).toBeGreaterThan(0);
  });

  it('should handle adding opportunity manually', async () => {
    renderWithProviders(<OpportunitiesPage />);

    const addButton = screen.getByText('Add Opportunity');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Add New Opportunity')).toBeInTheDocument();
    });

    const positionInput = screen.getByPlaceholderText(/Software Engineer/i);
    const companyInput = screen.getByPlaceholderText(/Google/i);
    const linkInput = screen.getByPlaceholderText(/linkedin.com/i);

    fireEvent.change(positionInput, { target: { value: 'Software Engineer' } });
    fireEvent.change(companyInput, { target: { value: 'Google' } });
    fireEvent.change(linkInput, { target: { value: 'https://linkedin.com/jobs/view/123' } });

    const saveButton = screen.getByText('Save Opportunity');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOpportunitiesState.addOpportunity).toHaveBeenCalledWith({
        position: 'Software Engineer',
        company: 'Google',
        link: 'https://linkedin.com/jobs/view/123',
        description: '',
        location: '',
        jobType: '',
        salary: '',
        postedDate: '',
      });
    });
  });

  it('should handle converting opportunity to application', () => {
    const mockOpportunities = [
      {
        id: '1',
        position: 'Software Engineer',
        company: 'Google',
        link: 'https://linkedin.com/jobs/view/123',
        capturedDate: new Date().toISOString(),
      },
    ];
    mockOpportunitiesState.opportunities = mockOpportunities;

    renderWithProviders(<OpportunitiesPage />);

    const applyButton = screen.getByText('Apply');
    fireEvent.click(applyButton);

    expect(mockConvertOpportunityToApplication).toHaveBeenCalledWith(mockOpportunities[0]);
    expect(mockApplicationsState.addApplication).toHaveBeenCalled();
    expect(mockOpportunitiesState.deleteOpportunity).toHaveBeenCalledWith('1');
  });

  it('should handle deleting opportunity', async () => {
    mockOpportunitiesState.opportunities = [
      {
        id: '1',
        position: 'Software Engineer',
        company: 'Google',
        link: 'https://linkedin.com/jobs/view/123',
        capturedDate: new Date().toISOString(),
      },
    ];

    renderWithProviders(<OpportunitiesPage />);

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('Delete Opportunity')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Are you sure you want to delete "Software Engineer"/i),
      ).toBeInTheDocument();
    });

    const confirmButtons = screen.getAllByText('Delete');
    const dialogConfirmButton = confirmButtons[confirmButtons.length - 1];
    fireEvent.click(dialogConfirmButton);

    await waitFor(
      () => {
        expect(mockOpportunitiesState.deleteOpportunity).toHaveBeenCalledWith('1');
      },
      { timeout: 3000 },
    );
  });

  it('should not delete opportunity when cancel is clicked', async () => {
    mockOpportunitiesState.opportunities = [
      {
        id: '1',
        position: 'Software Engineer',
        company: 'Google',
        link: 'https://linkedin.com/jobs/view/123',
        capturedDate: new Date().toISOString(),
      },
    ];

    renderWithProviders(<OpportunitiesPage />);

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    await waitFor(
      () => {
        expect(screen.queryByText('Delete Opportunity')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    await waitFor(() => {
      expect(screen.getByText(/Are you sure you want to delete/i)).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    await waitFor(
      () => {
        expect(mockOpportunitiesState.deleteOpportunity).not.toHaveBeenCalled();
      },
      { timeout: 1000 },
    );
  });

  it('should filter opportunities by search term', () => {
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
        company: 'Facebook',
        link: 'https://linkedin.com/jobs/view/456',
        capturedDate: new Date().toISOString(),
      },
    ];

    renderWithProviders(<OpportunitiesPage />);

    const searchInput = screen.getByPlaceholderText('Filter saved opportunities by position, company, or location...');
    fireEvent.change(searchInput, { target: { value: 'Google' } });

    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    expect(screen.queryByText('Frontend Developer')).not.toBeInTheDocument();
  });

  it('should show match threshold slider when matching is enabled', () => {
    mockMatchingState.preferences = { enabled: true, minMatchThreshold: 0 };
    mockOpportunitiesState.opportunities = [
      {
        id: '1',
        position: 'Software Engineer',
        company: 'Google',
        link: 'https://linkedin.com/jobs/view/123',
        capturedDate: new Date().toISOString(),
      },
    ];

    renderWithProviders(<OpportunitiesPage />);

    expect(screen.getByRole('slider')).toBeInTheDocument();
    expect(screen.getByText(/Min match score/i)).toBeInTheDocument();
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

    renderWithProviders(<OpportunitiesPage />);

    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });

  it('should filter opportunities by match threshold', () => {
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

    renderWithProviders(<OpportunitiesPage />);

    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('Frontend Developer')).toBeInTheDocument();

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '50' } });

    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    expect(screen.queryByText('Frontend Developer')).not.toBeInTheDocument();
  });

  it('should show empty state when no opportunities match the threshold', () => {
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

    renderWithProviders(<OpportunitiesPage />);

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '50' } });

    expect(screen.getByText(/No opportunities match the current threshold/i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('should display count of opportunities above threshold', () => {
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

    renderWithProviders(<OpportunitiesPage />);

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '50' } });

    expect(screen.getByText(/Showing 1 above 50% match/i)).toBeInTheDocument();
  });

  it('should initialize threshold from preferences minMatchThreshold', () => {
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

    renderWithProviders(<OpportunitiesPage />);

    const slider = screen.getByRole('slider') as HTMLInputElement;
    expect(slider.value).toBe('60');

    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    expect(screen.queryByText('Frontend Developer')).not.toBeInTheDocument();
  });

  it('should read match threshold from localStorage on mount', () => {
    localStorage.setItem('jat_match_threshold_override_v1', '75');
    mockMatchingState.preferences = { enabled: true, minMatchThreshold: 40 };
    mockOpportunitiesState.opportunities = [
      {
        id: '1',
        position: 'Software Engineer',
        company: 'Google',
        link: 'https://linkedin.com/jobs/view/123',
        capturedDate: new Date().toISOString(),
      },
    ];

    renderWithProviders(<OpportunitiesPage />);

    const slider = screen.getByRole('slider') as HTMLInputElement;
    expect(slider.value).toBe('75');
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

    const { rerender } = renderWithProviders(<OpportunitiesPage />);

    const slider = screen.getByRole('slider') as HTMLInputElement;
    expect(slider.value).toBe('40');

    // Simulate preferences loading from storage after mount
    mockMatchingState.preferences = { enabled: true, minMatchThreshold: 60 };
    rerender(<AlertProvider><OpportunitiesPage /></AlertProvider>);

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

    const { rerender } = renderWithProviders(<OpportunitiesPage />);

    const slider = screen.getByRole('slider') as HTMLInputElement;
    expect(slider.value).toBe('75');

    // Preferences load but override should win
    mockMatchingState.preferences = { enabled: true, minMatchThreshold: 60 };
    rerender(<AlertProvider><OpportunitiesPage /></AlertProvider>);

    await waitFor(() => {
      expect(slider.value).toBe('75');
    });
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

    renderWithProviders(<OpportunitiesPage />);

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

    renderWithProviders(<OpportunitiesPage />);

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

    renderWithProviders(<OpportunitiesPage />);

    const slider = screen.getByRole('slider') as HTMLInputElement;
    expect(slider.value).toBe('75');

    const resetButton = screen.getByRole('button', { name: /Reset to Default/i });
    fireEvent.click(resetButton);

    expect(slider.value).toBe('40');
    expect(localStorage.getItem('jat_match_threshold_override_v1')).toBeNull();
  });

  it('should save match threshold to localStorage only when user changes it', () => {
    mockMatchingState.preferences = { enabled: true, minMatchThreshold: 0 };
    mockOpportunitiesState.opportunities = [
      {
        id: '1',
        position: 'Software Engineer',
        company: 'Google',
        link: 'https://linkedin.com/jobs/view/123',
        capturedDate: new Date().toISOString(),
      },
    ];

    renderWithProviders(<OpportunitiesPage />);

    // Initial mount should NOT save to localStorage
    expect(localStorage.getItem('jat_match_threshold_override_v1')).toBeNull();

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '60' } });

    // Only user changes should persist
    expect(localStorage.getItem('jat_match_threshold_override_v1')).toBe('60');
  });

  describe('M5 audit: reactive state sync (no polling)', () => {
    // Regression guard for the M5 follow-up PR: the dead `jobOpportunitiesUpdated`
    // listener is now ACTIVE (paired with the new dispatcher in
    // `src/storage/opportunities.ts`), and the previous 2-second setInterval
    // polling was removed. If a future contributor re-adds the polling,
    // this test fails fast.
    it('does not schedule setInterval during mount (event-driven refresh only)', () => {
      const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
      try {
        renderWithProviders(<OpportunitiesPage />);
        expect(setIntervalSpy).not.toHaveBeenCalled();
      } finally {
        setIntervalSpy.mockRestore();
      }
    });
  });
});
