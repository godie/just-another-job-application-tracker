
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import JobPreviewPanel from './JobPreviewPanel';
import type { JobApplication } from '../types/applications';


function makeApp(overrides: Partial<JobApplication> = {}): JobApplication {
  return {
    id: 'app-1',
    position: 'Frontend Developer',
    company: 'Acme Inc',
    status: 'applied',
    applicationDate: '2025-03-10',
    salary: '90k–110k',
    platform: 'LinkedIn',
    location: 'Remote',
    workType: 'remote',
    contactName: 'Jane Recruiter',
    link: 'https://example.com/job/1',
    interviewDate: '2025-03-20',
    followUpDate: '2025-04-01',
    notes: 'Great culture fit, excited about this one.',
    timeline: [
      { id: 'e1', type: 'application_submitted', date: '2025-03-10', status: 'completed' },
      { id: 'e2', type: 'first_contact', date: '2025-03-12', status: 'completed' },
    ],
    customFields: { 'Referral': 'Bob Smith', 'Priority': 'High' },
    ...overrides,
  } as JobApplication;
}

vi.mock('../stores/applicationsStore', () => ({
  useApplicationsStore: vi.fn(),
}));

import { useApplicationsStore } from '../stores/applicationsStore';

const onClose = vi.fn();
const onNavigate = vi.fn();
const onDelete = vi.fn();

function renderPanel(jobId: string, overrides?: Partial<ReturnType<typeof makeApp>>) {
  const app = overrides ? makeApp(overrides) : makeApp();
  const apps = app ? [app] : [];

  (useApplicationsStore as ReturnType<typeof vi.fn>).mockImplementation(
    (selector: (state: { applications: JobApplication[] }) => unknown) => selector({ applications: apps })
  );

  return render(
    <JobPreviewPanel
      jobId={jobId}
      onClose={onClose}
      onNavigate={onNavigate}
      onDelete={onDelete}
    />
  );
}

// Tests

describe('JobPreviewPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });


  it('renders position, company, and status', () => {
    renderPanel('app-1');
    expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
    expect(screen.getByText('Acme Inc')).toBeInTheDocument();
    expect(screen.getByText('Applied')).toBeInTheDocument();
  });

  it('renders title as a clickable button that opens the full details page', () => {
    renderPanel('app-1');
    const titleBtn = screen.getByTestId('preview-title-button');
    expect(titleBtn).toBeInTheDocument();
    expect(titleBtn).toHaveTextContent('Frontend Developer');
    expect(titleBtn.getAttribute('aria-label')).toBe('Open full job details');
  });

  it('renders location, workType, salary, platform when present', () => {
    renderPanel('app-1');
    expect(screen.getByText('Remote')).toBeInTheDocument();
    expect(screen.getByText('90k–110k')).toBeInTheDocument();
    const remoteElements = screen.getAllByText('Remote');
    expect(remoteElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('LinkedIn')).toBeInTheDocument();
  });

  it('does not render location/salary/workType/platform when absent', () => {
    renderPanel('app-1', { location: '', workType: '', salary: '', platform: '' } as Partial<JobApplication>);
    expect(screen.queryByText('Location')).toBeNull();
  });

  it('renders dates section with applied, interview, follow-up', () => {
    renderPanel('app-1');
    expect(screen.getByText('Applied')).toBeInTheDocument();
    expect(screen.getByText('Mar 10, 2025')).toBeInTheDocument();
    expect(screen.getByText('Interview')).toBeInTheDocument();
    expect(screen.getByText('Mar 20, 2025')).toBeInTheDocument();
    expect(screen.getByText('Follow-up')).toBeInTheDocument();
    expect(screen.getByText('Apr 1, 2025')).toBeInTheDocument();
  });

  it('shows "No dates recorded" when no dates exist', () => {
    renderPanel('app-1', {
      applicationDate: '',
      interviewDate: '',
      followUpDate: '',
    } as Partial<JobApplication>);
    expect(screen.getByText('No dates recorded')).toBeInTheDocument();
  });

  it('renders contact name when present', () => {
    renderPanel('app-1');
    expect(screen.getByText('Jane Recruiter')).toBeInTheDocument();
  });

  it('does not render contact section when contactName is empty', () => {
    renderPanel('app-1', { contactName: '' } as Partial<JobApplication>);
    expect(screen.queryByText('Contact')).toBeNull();
  });

  it('renders job link when present', () => {
    renderPanel('app-1');
    const link = screen.getByRole('link', { name: /example\.com/ });
    expect(link).toBeInTheDocument();
    expect(link.getAttribute('href')).toBe('https://example.com/job/1');
  });

  it('does not render job link when absent', () => {
    renderPanel('app-1', { link: '' } as Partial<JobApplication>);
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('renders notes excerpt (truncated to 150 chars)', () => {
    const longNotes = 'A'.repeat(200);
    renderPanel('app-1', { notes: longNotes } as Partial<JobApplication>);
    const expected = 'A'.repeat(150) + '...';
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it('does not render notes section when notes is empty', () => {
    renderPanel('app-1', { notes: '' } as Partial<JobApplication>);
    expect(screen.queryByText('Notes')).toBeNull();
  });


  it('shows timeline event count (plural)', () => {
    renderPanel('app-1');
    expect(screen.getByText('2 timeline events')).toBeInTheDocument();
  });

  it('shows timeline event count (singular)', () => {
    renderPanel('app-1', {
      timeline: [{ id: 'e1', type: 'application_submitted', date: '2025-03-10', status: 'completed' }],
    });
    expect(screen.getByText('1 timeline event')).toBeInTheDocument();
  });

  it('hides timeline count when zero', () => {
    renderPanel('app-1', { timeline: [] });
    expect(screen.queryByText(/timeline event/)).toBeNull();
  });

  it('shows custom fields count (plural)', () => {
    renderPanel('app-1');
    expect(screen.getByText('2 custom fields')).toBeInTheDocument();
  });

  it('shows custom fields count (singular)', () => {
    renderPanel('app-1', { customFields: { 'Priority': 'High' } });
    expect(screen.getByText('1 custom field')).toBeInTheDocument();
  });

  it('hides custom fields count when zero', () => {
    renderPanel('app-1', { customFields: {} });
    expect(screen.queryByText(/custom field/)).toBeNull();
  });


  it('calls onClose when backdrop is clicked', () => {
    renderPanel('app-1');
    fireEvent.click(screen.getByTestId('preview-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button is clicked', () => {
    renderPanel('app-1');
    fireEvent.click(screen.getByTestId('preview-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    renderPanel('app-1');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clicking the title navigates to the full details page', () => {
    renderPanel('app-1');
    fireEvent.click(screen.getByTestId('preview-title-button'));
    expect(onNavigate).toHaveBeenCalledWith('job-details');
    // The URL is kept in sync by App.tsx's URL-sync effect once currentPage changes;
    // JobPreviewPanel's unit contract is just to call onNavigate.
  });

  it('clicking Edit navigates to full details and closes the preview', () => {
    renderPanel('app-1');
    fireEvent.click(screen.getByTestId('preview-edit'));
    expect(onNavigate).toHaveBeenCalledWith('job-details');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete when Delete button is clicked', () => {
    renderPanel('app-1');
    fireEvent.click(screen.getByTestId('preview-delete'));
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'app-1' }));
  });


  it('renders not-found message when application does not exist', () => {
    (useApplicationsStore as ReturnType<typeof vi.fn>).mockImplementation(
      (selector: (state: { applications: JobApplication[] }) => unknown) => selector({ applications: [] })
    );
    render(
      <JobPreviewPanel
        jobId="nonexistent"
        onClose={onClose}
        onNavigate={onNavigate}
        onDelete={onDelete}
      />
    );
    expect(screen.getByText('Application not found.')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked in not-found state', () => {
    (useApplicationsStore as ReturnType<typeof vi.fn>).mockImplementation(
      (selector: (state: { applications: JobApplication[] }) => unknown) => selector({ applications: [] })
    );
    render(
      <JobPreviewPanel
        jobId="nonexistent"
        onClose={onClose}
        onNavigate={onNavigate}
        onDelete={onDelete}
      />
    );
    fireEvent.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });


  it('has accessible panel title', () => {
    renderPanel('app-1');
    const panel = screen.getByTestId('preview-panel');
    expect(panel.getAttribute('aria-label')).toBe('Job Preview');
    expect(screen.getByRole('complementary')).toBe(panel);
  });

  it('close button has accessible label', () => {
    renderPanel('app-1');
    expect(screen.getByTestId('preview-close').getAttribute('aria-label')).toBe('Close');
  });


  it('does not throw when onNavigate is undefined', () => {
    (useApplicationsStore as ReturnType<typeof vi.fn>).mockImplementation(
      (selector: (state: { applications: JobApplication[] }) => unknown) => selector({ applications: [makeApp()] })
    );
    expect(() =>
      render(
        <JobPreviewPanel
          jobId="app-1"
          onClose={onClose}
          onDelete={onDelete}
        />
      )
    ).not.toThrow();
  });

  it('does not throw when onDelete is undefined', () => {
    (useApplicationsStore as ReturnType<typeof vi.fn>).mockImplementation(
      (selector: (state: { applications: JobApplication[] }) => unknown) => selector({ applications: [makeApp()] })
    );
    expect(() =>
      render(<JobPreviewPanel jobId="app-1" onClose={onClose} />)
    ).not.toThrow();
    fireEvent.click(screen.getByTestId('preview-delete'));
  });
});
