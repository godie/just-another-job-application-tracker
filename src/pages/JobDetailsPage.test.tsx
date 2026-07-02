
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import JobDetailsPage from './JobDetailsPage';
import type { JobApplication } from '../types/applications';


function makeApp(overrides: Partial<JobApplication> = {}): JobApplication {
  return {
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
    notes: 'Great team, interesting tech stack.',
    timeline: [
      { id: 'e1', type: 'application_submitted', date: '2025-01-15', status: 'completed' },
      { id: 'e2', type: 'technical_interview', date: '2025-02-01', status: 'scheduled' },
    ],
    customFields: { 'Visa Sponsor': 'Yes', 'Referral': 'Internal' },
    ...overrides,
  } as JobApplication;
}

const deleteApplication = vi.fn();
const updateApplication = vi.fn();
const onNavigate = vi.fn();

vi.mock('../stores/applicationsStore', () => ({
  useApplicationsStore: vi.fn(),
}));

import { useApplicationsStore } from '../stores/applicationsStore';

vi.mock('../components/AlertProvider', () => ({
  useAlert: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showInfo: vi.fn(),
  }),
}));

function setupStore(apps: JobApplication[]) {
  (useApplicationsStore as ReturnType<typeof vi.fn>).mockImplementation(
    (selector: (state: {
      applications: JobApplication[];
      deleteApplication: typeof deleteApplication;
      updateApplication: typeof updateApplication;
    }) => unknown) =>
      selector({ applications: apps, deleteApplication, updateApplication })
  );
}

function renderPage() {
  return render(<JobDetailsPage onNavigate={onNavigate} />);
}

function setUrlJobId(jobId: string | null) {
  const search = jobId ? `?page=job-details&jobId=${jobId}` : '?page=job-details';
  window.history.replaceState({}, '', search);
}

// Tests

describe('JobDetailsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.lang = 'en-US';
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/');
    document.documentElement.lang = '';
  });


  it('renders not-found state when jobId is missing from URL', () => {
    setUrlJobId(null);
    setupStore([]);
    renderPage();
    expect(screen.getByText('Job Not Found')).toBeInTheDocument();
    expect(
      screen.getByText(/The job application you are looking for does not exist/)
    ).toBeInTheDocument();
    expect(screen.getByText(/Back to Applications/)).toBeInTheDocument();
  });

  it('renders not-found state when application does not exist', () => {
    setUrlJobId('nonexistent');
    const app = makeApp(); // different ID
    setupStore([app]);
    renderPage();
    expect(screen.getByText('Job Not Found')).toBeInTheDocument();
  });

  it('navigates to applications when "Back to Applications" is clicked in not-found state', () => {
    setUrlJobId(null);
    setupStore([]);
    renderPage();
    fireEvent.click(screen.getByText(/Back to Applications/));
    expect(onNavigate).toHaveBeenCalledWith('applications');
  });


  it('renders position, company, status, and job ID', () => {
    setUrlJobId('app-1');
    setupStore([makeApp()]);
    renderPage();

    expect(screen.getAllByText('Senior Backend Engineer').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Widgets Inc').length).toBeGreaterThanOrEqual(2);
    const badges = screen.getAllByText('interviewing');
    expect(badges.length).toBeGreaterThanOrEqual(1);
    // Job ID
    expect(screen.getByText('app-1')).toBeInTheDocument();
  });

  it('renders all key detail fields', () => {
    setUrlJobId('app-1');
    setupStore([makeApp()]);
    renderPage();

    expect(screen.getByText('Position')).toBeInTheDocument();
    expect(screen.getByText('Company')).toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('Berlin, DE')).toBeInTheDocument();
    expect(screen.getByText('Work Type')).toBeInTheDocument();
    expect(screen.getByText('hybrid')).toBeInTheDocument();
    expect(screen.getByText('Days in Office')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Salary')).toBeInTheDocument();
    expect(screen.getByText('120k–150k')).toBeInTheDocument();
    expect(screen.getByText('Platform')).toBeInTheDocument();
    expect(screen.getByText('Indeed')).toBeInTheDocument();
    expect(screen.getByText('Contact')).toBeInTheDocument();
    expect(screen.getByText('Alice Hiring')).toBeInTheDocument();
  });

  it('renders formatted dates', () => {
    setUrlJobId('app-1');
    setupStore([makeApp()]);
    renderPage();

    expect(screen.getAllByText('Jan 15, 2025').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Feb 1, 2025').length).toBeGreaterThan(0);
    expect(screen.getByText('Mar 1, 2025')).toBeInTheDocument();
  });

  it('does not render hybridDays when absent', () => {
    setUrlJobId('app-1');
    setupStore([makeApp({ hybridDaysInOffice: undefined } as Partial<JobApplication>)]);
    renderPage();
    expect(screen.queryByText('Days in Office')).toBeNull();
  });

  it('renders job link as clickable hyperlink', () => {
    setUrlJobId('app-1');
    setupStore([makeApp()]);
    renderPage();

    const link = screen.getByText('https://example.com/job/sbe');
    expect(link.tagName).toBe('A');
    expect(link.getAttribute('href')).toBe('https://example.com/job/sbe');
    expect(link.getAttribute('target')).toBe('_blank');
  });

  it('does not render job link when absent', () => {
    setUrlJobId('app-1');
    setupStore([makeApp({ link: '' } as Partial<JobApplication>)]);
    renderPage();
    expect(screen.queryByText('Job Link')).toBeNull();
  });

  it('renders notes section when present', () => {
    setUrlJobId('app-1');
    setupStore([makeApp()]);
    renderPage();
    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByText('Great team, interesting tech stack.')).toBeInTheDocument();
  });

  it('does not render notes section when absent', () => {
    setUrlJobId('app-1');
    setupStore([makeApp({ notes: '' } as Partial<JobApplication>)]);
    renderPage();
    expect(screen.queryByText('Notes')).toBeNull();
  });


  it('renders timeline events when present', () => {
    setUrlJobId('app-1');
    setupStore([makeApp()]);
    renderPage();

    expect(screen.getByText(/Timeline/)).toBeInTheDocument();
    expect(screen.getByText('Application Submitted')).toBeInTheDocument();
  });

  it('does not render timeline section when empty', () => {
    setUrlJobId('app-1');
    setupStore([makeApp({ timeline: [] } as Partial<JobApplication>)]);
    renderPage();
    expect(screen.queryByText(/Timeline/)).toBeNull();
  });


  it('renders custom fields when present', () => {
    setUrlJobId('app-1');
    setupStore([makeApp()]);
    renderPage();

    expect(screen.getByText('Custom Fields')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('Internal')).toBeInTheDocument();
  });

  it('does not render custom fields section when empty', () => {
    setUrlJobId('app-1');
    setupStore([makeApp({ customFields: {} } as Partial<JobApplication>)]);
    renderPage();
    expect(screen.queryByText('Custom Fields')).toBeNull();
  });


  it('renders back navigation button and navigates on click', () => {
    setUrlJobId('app-1');
    setupStore([makeApp()]);
    renderPage();

    const backButtons = screen.getAllByText(/Back to Applications/);
    expect(backButtons.length).toBe(2);

    fireEvent.click(backButtons[0]);
    expect(onNavigate).toHaveBeenCalledWith('applications');
  });

  it('renders edit and delete buttons', () => {
    setUrlJobId('app-1');
    setupStore([makeApp()]);
    renderPage();

    const editButtons = screen.getAllByText('Edit');
    expect(editButtons.length).toBeGreaterThanOrEqual(1);

    const deleteButtons = screen.getAllByText('Delete');
    expect(deleteButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('clicking Edit enters inline edit mode (does not redirect)', () => {
    setUrlJobId('app-1');
    setupStore([makeApp()]);
    renderPage();
    fireEvent.click(screen.getAllByText('Edit')[0]);
    expect(screen.getByTestId('details-edit-form')).toBeInTheDocument();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('inline edit mode shows inputs with current values', () => {
    setUrlJobId('app-1');
    setupStore([makeApp()]);
    renderPage();
    fireEvent.click(screen.getAllByText('Edit')[0]);
    expect(screen.getByTestId('form-position')).toHaveValue('Senior Backend Engineer');
    expect(screen.getByTestId('form-company')).toHaveValue('Widgets Inc');
    expect(screen.getByTestId('form-notes')).toHaveValue('Great team, interesting tech stack.');
  });

  it('notes textarea is associated with its label (label/control pairing)', () => {
    setUrlJobId('app-1');
    setupStore([makeApp()]);
    renderPage();
    fireEvent.click(screen.getAllByText('Edit')[0]);

    // getByLabelText resolves nested <label><span>Notes</span><textarea/></label>
    // OR <label htmlFor={id}> with matching textarea id. Both are valid associations.
    const textarea = screen.getByTestId('form-notes');
    expect(screen.getByLabelText(/Notes/)).toBe(textarea);
    // Visual label is rendered as the wrapping <span>, screen readers announce it.
    const labeledBy = textarea.closest('label');
    expect(labeledBy).not.toBeNull();
    expect(labeledBy).toHaveTextContent(/Notes/i);
  });

  it('Save persists via updateApplication and exits edit mode', () => {
    setUrlJobId('app-1');
    setupStore([makeApp()]);
    renderPage();
    fireEvent.click(screen.getAllByText('Edit')[0]);
    fireEvent.change(screen.getByTestId('form-position'), { target: { value: 'Staff Engineer' } });
    fireEvent.click(screen.getByTestId('details-save'));
    expect(updateApplication).toHaveBeenCalledWith(
      'app-1',
      expect.objectContaining({ position: 'Staff Engineer' }),
    );
    expect(screen.queryByTestId('details-edit-form')).toBeNull();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('Cancel exits edit mode without calling updateApplication', () => {
    setUrlJobId('app-1');
    setupStore([makeApp()]);
    renderPage();
    fireEvent.click(screen.getAllByText('Edit')[0]);
    fireEvent.change(screen.getByTestId('form-position'), { target: { value: 'Should not save' } });
    fireEvent.click(screen.getByTestId('details-cancel'));
    expect(updateApplication).not.toHaveBeenCalled();
    expect(screen.queryByTestId('details-edit-form')).toBeNull();
  });

  it('double-clicking the header card enters edit mode', () => {
    setUrlJobId('app-1');
    setupStore([makeApp()]);
    renderPage();
    fireEvent.doubleClick(screen.getByTestId('details-header-card'));
    expect(screen.getByTestId('details-edit-form')).toBeInTheDocument();
  });

  it('does not enter edit mode when status is Deleted', () => {
    setUrlJobId('app-1');
    setupStore([makeApp({ status: 'Deleted' } as Partial<JobApplication>)]);
    renderPage();
    fireEvent.click(screen.getAllByText('Edit')[0]);
    expect(screen.queryByTestId('details-edit-form')).toBeNull();
    fireEvent.doubleClick(screen.getByTestId('details-header-card'));
    expect(screen.queryByTestId('details-edit-form')).toBeNull();
  });

  it('clicking delete calls deleteApplication and navigates', () => {
    setUrlJobId('app-1');
    setupStore([makeApp()]);

    renderPage();

    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    expect(deleteApplication).toHaveBeenCalledWith('app-1');
    expect(onNavigate).toHaveBeenCalledWith('applications');
  });


  it('renders the Footer component', () => {
    setUrlJobId('app-1');
    setupStore([makeApp()]);
    renderPage();

    const footer = document.querySelector('footer');
    expect(footer).toBeInTheDocument();
    expect(screen.getByText('Terms of Use')).toBeInTheDocument();
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
    expect(screen.getByText('About')).toBeInTheDocument();
  });


  it('sets the document title via useSEO hook', () => {
    setUrlJobId('app-1');
    setupStore([makeApp()]);
    renderPage();

    expect(document.title).toBe(
      'Senior Backend Engineer at Widgets Inc - My Applications | JAJAT'
    );
  });

  it('sets a default SEO title when application is not found', () => {
    setUrlJobId(null);
    setupStore([]);
    renderPage();

    expect(document.title).toBe('My Applications | JAJAT');
  });


  it('omits optional fields when their values are empty', () => {
    setUrlJobId('app-1');
    setupStore([
      makeApp({
        location: '',
        workType: '',
        salary: '',
        platform: '',
        contactName: '',
        applicationDate: '',
        interviewDate: '',
        followUpDate: '',
      } as Partial<JobApplication>),
    ]);
    renderPage();

    expect(screen.getByText('Position')).toBeInTheDocument();
    expect(screen.getByText('Company')).toBeInTheDocument();
    expect(screen.queryByText('Berlin, DE')).toBeNull();
  });
});
