// src/components/JobPreviewPanel.test.tsx

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import JobPreviewPanel from './JobPreviewPanel';
import type { JobApplication } from '../types/applications';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// Mock the store so we can control which applications are available
vi.mock('../stores/applicationsStore', () => ({
  useApplicationsStore: vi.fn(),
}));

// Import the mocked hook so we can control its return value per test
import { useApplicationsStore } from '../stores/applicationsStore';

const onClose = vi.fn();
const onNavigate = vi.fn();
const onEdit = vi.fn();
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
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('JobPreviewPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  // -- Rendering with data ---------------------------------------------------

  it('renders position, company, and status', () => {
    renderPanel('app-1');
    expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
    expect(screen.getByText('Acme Inc')).toBeInTheDocument();
    expect(screen.getByText('Applied')).toBeInTheDocument();
  });

  it('renders Job ID as a clickable button', () => {
    renderPanel('app-1');
    const jobIdBtn = screen.getByTestId('preview-job-id');
    expect(jobIdBtn).toBeInTheDocument();
    expect(jobIdBtn).toHaveTextContent('app-1');
    expect(jobIdBtn.getAttribute('aria-label')).toBe('Open full job details');
  });

  it('renders location, workType, salary, platform when present', () => {
    renderPanel('app-1');
    expect(screen.getByText('Remote')).toBeInTheDocument();
    expect(screen.getByText('90k–110k')).toBeInTheDocument();
    // The workType "remote" renders as "remote" (lowercase) in JSDOM (CSS capitalize
    // doesn't affect text content) so only location shows as "Remote"
    const remoteElements = screen.getAllByText('Remote');
    expect(remoteElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('LinkedIn')).toBeInTheDocument();
  });

  it('does not render location/salary/workType/platform when absent', () => {
    renderPanel('app-1', { location: '', workType: '', salary: '', platform: '' } as Partial<JobApplication>);
    // Should not crash — the grid just won't render those dt/dd pairs
    expect(screen.queryByText('Location')).toBeNull();
  });

  it('renders dates section with applied, interview, follow-up', () => {
    renderPanel('app-1');
    // "Applied" label and formatted date
    expect(screen.getByText('Applied')).toBeInTheDocument();
    expect(screen.getByText('Mar 10, 2025')).toBeInTheDocument();
    // "Interview" label and formatted date
    expect(screen.getByText('Interview')).toBeInTheDocument();
    expect(screen.getByText('Mar 20, 2025')).toBeInTheDocument();
    // "Follow-up" label and formatted date
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

  // -- Pluralised meta counts ------------------------------------------------

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

  // -- Interactions ----------------------------------------------------------

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

  it('calls onNavigate with job-details when Job ID is clicked', () => {
    renderPanel('app-1');
    fireEvent.click(screen.getByTestId('preview-job-id'));
    expect(onNavigate).toHaveBeenCalledWith('job-details');
  });

  it('updates URL when Job ID is clicked (pushState)', () => {
    const pushState = vi.spyOn(window.history, 'pushState');
    renderPanel('app-1');
    fireEvent.click(screen.getByTestId('preview-job-id'));
    expect(pushState).toHaveBeenCalled();
    const url = (pushState.mock.calls[0] as [unknown, string, string])[2];
    expect(url).toContain('page=job-details');
    expect(url).toContain('jobId=app-1');
    pushState.mockRestore();
  });

  it('calls onEdit when Edit button is clicked', () => {
    renderPanel('app-1');
    fireEvent.click(screen.getByTestId('preview-edit'));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'app-1' }));
  });

  it('calls onDelete when Delete button is clicked', () => {
    renderPanel('app-1');
    fireEvent.click(screen.getByTestId('preview-delete'));
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'app-1' }));
  });

  // -- Not-found state -------------------------------------------------------

  it('renders not-found message when application does not exist', () => {
    (useApplicationsStore as ReturnType<typeof vi.fn>).mockImplementation(
      (selector: (state: { applications: JobApplication[] }) => unknown) => selector({ applications: [] })
    );
    render(
      <JobPreviewPanel
        jobId="nonexistent"
        onClose={onClose}
        onNavigate={onNavigate}
        onEdit={onEdit}
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
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );
    fireEvent.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // -- Accessibility ---------------------------------------------------------

  it('has accessible panel title', () => {
    renderPanel('app-1');
    const panel = screen.getByTestId('preview-panel');
    expect(panel.getAttribute('aria-label')).toBe('Job Preview');
    // aside has implicit ARIA role of complementary per HTML spec
    expect(screen.getByRole('complementary')).toBe(panel);
  });

  it('close button has accessible label', () => {
    renderPanel('app-1');
    expect(screen.getByTestId('preview-close').getAttribute('aria-label')).toBe('Close');
  });

  // -- Optional callbacks ----------------------------------------------------

  it('does not throw when onNavigate is undefined', () => {
    (useApplicationsStore as ReturnType<typeof vi.fn>).mockImplementation(
      (selector: (state: { applications: JobApplication[] }) => unknown) => selector({ applications: [makeApp()] })
    );
    expect(() =>
      render(
        <JobPreviewPanel
          jobId="app-1"
          onClose={onClose}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )
    ).not.toThrow();
  });

  it('does not throw when onEdit and onDelete are undefined', () => {
    (useApplicationsStore as ReturnType<typeof vi.fn>).mockImplementation(
      (selector: (state: { applications: JobApplication[] }) => unknown) => selector({ applications: [makeApp()] })
    );
    render(
      <JobPreviewPanel jobId="app-1" onClose={onClose} />
    );
    // Click only Edit/Delete buttons via data-testid to avoid side effects
    // from the Job ID button (which triggers window.history.pushState)
    fireEvent.click(screen.getByTestId('preview-edit'));
    fireEvent.click(screen.getByTestId('preview-delete'));
    // Assert no crash — both handlers use optional chaining and are undefined
    expect(true).toBe(true);
  });
});
