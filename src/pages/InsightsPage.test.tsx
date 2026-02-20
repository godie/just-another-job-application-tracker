// src/pages/InsightsPage.test.tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import InsightsPage from './InsightsPage';
import type { JobApplication } from '../types/applications';

const mockApplications: JobApplication[] = [
  {
    id: '1',
    position: 'Software Engineer',
    company: 'Tech Corp',
    status: 'interviewing',
    timeline: [
      { id: 'e1', type: 'application_submitted', date: '2023-01-01', status: 'completed' },
      { id: 'e2', type: 'technical_interview', date: '2023-01-10', status: 'scheduled' },
    ],
    salary: '',
    applicationDate: '2023-01-01',
    interviewDate: '2023-01-10',
    notes: '',
    link: '',
    platform: '',
    contactName: '',
    followUpDate: ''
  },
  {
    id: '2',
    position: 'Product Manager',
    company: 'Innovate LLC',
    status: 'rejected',
    timeline: [],
    salary: '',
    applicationDate: '2023-02-01',
    interviewDate: '',
    notes: '',
    link: '',
    platform: '',
    contactName: '',
    followUpDate: ''
  },
  {
    id: '3',
    position: 'UX Designer',
    company: 'Creative Inc',
    status: 'applied',
    timeline: [],
    salary: '',
    applicationDate: '2023-02-15',
    interviewDate: '',
    notes: '',
    link: '',
    platform: '',
    contactName: '',
    followUpDate: ''
  },
];

vi.mock('../stores/applicationsStore', () => ({
  useApplicationsStore: (selector: (state: { applications: JobApplication[] }) => unknown) =>
    selector({ applications: mockApplications }),
}));

vi.mock('recharts', async () => {
  const OriginalRecharts = await vi.importActual('recharts');
  return {
    ...OriginalRecharts,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div className="recharts-responsive-container">{children}</div>
    ),
  };
});

vi.mock('../components/StatusBarChart', () => ({
  default: () => <div>Applications by Status</div>
}));

vi.mock('../components/InterviewBarChart', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>
}));

describe('InsightsPage', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders insights title', () => {
    render(<InsightsPage />);
    expect(screen.getByText('Insights')).toBeInTheDocument();
  });

  it('displays correct stats', () => {
    render(<InsightsPage />);
    const totalApplicationsTitle = screen.getByText('Total Applications');
    expect(totalApplicationsTitle.nextElementSibling).toHaveTextContent('3');

    const totalInterviewsTitle = screen.getByText('Total Interviews');
    expect(totalInterviewsTitle.nextElementSibling).toHaveTextContent('1');

    const rejectedApplicationsTitle = screen.getByText('Rejected Applications');
    expect(rejectedApplicationsTitle.nextElementSibling).toHaveTextContent('1');

    const rejectionPercentageTitle = screen.getByText('Rejection Percentage');
    expect(rejectionPercentageTitle.nextElementSibling).toHaveTextContent('33.33%');
  });

  it('renders both charts', async () => {
    render(<InsightsPage />);
    await waitFor(() => {
      expect(screen.getByText('Applications by Status')).toBeInTheDocument();
    });
    expect(screen.getByText('Interviews by Application Status')).toBeInTheDocument();
  });

  it('renders interviews by type chart when interview events exist', async () => {
    render(<InsightsPage />);
    // The "Interviews by Type" chart should appear when there are interview events
    await waitFor(() => {
      expect(screen.getByText('Interviews by Type')).toBeInTheDocument();
    });
  });
});
