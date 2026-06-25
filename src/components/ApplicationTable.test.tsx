import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ApplicationTable from './ApplicationTable';
import type { JobApplication } from '../types/applications';
import type { TableColumn } from '../types/table';

vi.mock('dompurify', () => ({
  default: {
    sanitize: (html: string) => html,
  },
}));

const toColumn = (id: string, label: string): TableColumn => ({ id, label });

const mockApplication: JobApplication = {
  id: '1',
  position: 'Software Engineer',
  company: 'Tech Corp',
  status: 'Applied',
  salary: '100k',
  applicationDate: '2024-01-01',
  interviewDate: '',
  platform: 'LinkedIn',
  contactName: 'John Doe',
  followUpDate: '',
  notes: 'Test notes',
  link: 'https://example.com/job',
  timeline: [],
};

describe('ApplicationTable', () => {
  const mockOnSelectJob = vi.fn();
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();
  const defaultColumns: TableColumn[] = [
    toColumn('position', 'Position'),
    toColumn('company', 'Company'),
    toColumn('status', 'Status'),
    toColumn('salary', 'Salary'),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state message when no data', () => {
    render(
      <ApplicationTable
        columns={defaultColumns}
        data={[]}
        onSelectJob={mockOnSelectJob}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const emptyMessages = screen.getAllByText(/Use the "\+ Add Entry" button to start tracking your applications!/i);
    expect(emptyMessages.length).toBeGreaterThan(0);
  });

  it('renders desktop table view with columns', () => {
    render(
      <ApplicationTable
        columns={defaultColumns}
        data={[mockApplication]}
        onSelectJob={mockOnSelectJob}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const table = screen.getByTestId('application-table');
    expect(table).toBeInTheDocument();

    defaultColumns.forEach(column => {
      expect(screen.getByRole('columnheader', { name: column.label })).toBeInTheDocument();
    });

    expect(screen.getAllByText('Software Engineer').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Tech Corp').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Applied').length).toBeGreaterThan(0);
  });

  it('renders mobile card view when data exists', () => {
    const { container } = render(
      <ApplicationTable
        columns={defaultColumns}
        data={[mockApplication]}
        onSelectJob={mockOnSelectJob}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const mobileCardContainer = container.querySelector('.md\\:hidden');
    expect(mobileCardContainer).toBeInTheDocument();
    
    const card = container.querySelector('[data-testid="card-1"]');
    expect(card).toBeInTheDocument();
  });

  it('calls onSelectJob when table row is clicked', () => {
    render(
      <ApplicationTable
        columns={defaultColumns}
        data={[mockApplication]}
        onSelectJob={mockOnSelectJob}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const row = screen.getByTestId('row-1');
    const firstCell = row.querySelector('td');
    expect(firstCell).toBeInTheDocument();
    
    if (firstCell) {
      fireEvent.click(firstCell);
      expect(mockOnSelectJob).toHaveBeenCalledWith(mockApplication);
    }
  });

  it('calls onSelectJob when mobile card is clicked', () => {
    const { container } = render(
      <ApplicationTable
        columns={defaultColumns}
        data={[mockApplication]}
        onSelectJob={mockOnSelectJob}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const card = container.querySelector('[data-testid="card-1"]');
    expect(card).toBeInTheDocument();

    if (card) {
      fireEvent.click(card);
      expect(mockOnSelectJob).toHaveBeenCalledWith(mockApplication);
    }
  });

  it('shows delete button on hover for desktop table', async () => {
    render(
      <ApplicationTable
        columns={defaultColumns}
        data={[mockApplication]}
        onSelectJob={mockOnSelectJob}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const row = screen.getByTestId('row-1');
    fireEvent.mouseEnter(row);

    await waitFor(() => {
      const deleteButtons = screen.getAllByTestId('delete-btn-1');
      expect(deleteButtons.length).toBeGreaterThan(0);
    });
  });

  it('shows delete button in mobile card view', () => {
    render(
      <ApplicationTable
        columns={defaultColumns}
        data={[mockApplication]}
        onSelectJob={mockOnSelectJob}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const deleteButtons = screen.getAllByText('Delete');
    expect(deleteButtons.length).toBeGreaterThan(0);
    
    const mobileCardDelete = deleteButtons.find(btn => 
      btn.closest('[data-testid^="card-"]') !== null
    );
    expect(mobileCardDelete).toBeInTheDocument();
  });

  it('opens delete confirmation dialog when delete button is clicked', async () => {
    render(
      <ApplicationTable
        columns={defaultColumns}
        data={[mockApplication]}
        onSelectJob={mockOnSelectJob}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    await waitFor(() => {
      const deleteButtons = screen.getAllByTestId('delete-btn-1');
      expect(deleteButtons.length).toBeGreaterThan(0);
      
      fireEvent.click(deleteButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText(/Delete Application/i)).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to delete/i)).toBeInTheDocument();
    });
  });

  it('renders link as clickable anchor', () => {
    render(
      <ApplicationTable
        columns={[toColumn('position', 'Position'), toColumn('link', 'Link')]}
        data={[mockApplication]}
        onSelectJob={mockOnSelectJob}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const links = screen.getAllByRole('link');
    const jobLink = links.find(link => link.getAttribute('href') === 'https://example.com/job');
    expect(jobLink).toBeInTheDocument();
    expect(jobLink).toHaveAttribute('target', '_blank');
    expect(jobLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('displays position and company prominently in mobile card', () => {
    const { container } = render(
      <ApplicationTable
        columns={defaultColumns}
        data={[mockApplication]}
        onSelectJob={mockOnSelectJob}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const card = container.querySelector('[data-testid="card-1"]');
    expect(card).toBeInTheDocument();
    
    expect(screen.getAllByText('Software Engineer').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Tech Corp').length).toBeGreaterThan(0);
  });

  it('displays status badge in mobile card', () => {
    render(
      <ApplicationTable
        columns={defaultColumns}
        data={[mockApplication]}
        onSelectJob={mockOnSelectJob}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getAllByText('Applied').length).toBeGreaterThan(0);
  });

  it('handles multiple applications correctly', () => {
    const applications: JobApplication[] = [
      mockApplication,
      {
        ...mockApplication,
        id: '2',
        position: 'Product Manager',
        company: 'Another Corp',
        status: 'Interviewing',
      },
    ];

    render(
      <ApplicationTable
        columns={defaultColumns}
        data={applications}
        onSelectJob={mockOnSelectJob}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getAllByText('Software Engineer').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Product Manager').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Tech Corp').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Another Corp').length).toBeGreaterThan(0);
  });

  it('handles empty string values gracefully', () => {
    const emptyApplication: JobApplication = {
      ...mockApplication,
      salary: '',
      notes: '',
      link: '',
    };

    render(
      <ApplicationTable
        columns={[
          toColumn('position', 'Position'),
          toColumn('salary', 'Salary'),
          toColumn('notes', 'Notes'),
        ]}
        data={[emptyApplication]}
        onSelectJob={mockOnSelectJob}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getAllByText('Software Engineer').length).toBeGreaterThan(0);
  });
});
