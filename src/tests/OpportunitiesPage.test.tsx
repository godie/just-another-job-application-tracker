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
  useApplicationsStore: (selector: (state: typeof mockApplicationsState) => unknown) =>
    selector(mockApplicationsState),
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

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<AlertProvider>{ui}</AlertProvider>);
};

describe('OpportunitiesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOpportunitiesState.opportunities = [];
    mockOpportunitiesState.addOpportunity.mockImplementation((opp: Omit<JobOpportunity, 'id' | 'capturedDate'>) => ({
      ...opp,
      id: 'test-id-1',
      capturedDate: new Date().toISOString(),
    }));
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
});
