// src/components/ApplicationTable.store.integration.test.tsx
// Integration test: ApplicationTable + Zustand store.
// Verifies that when data comes from the applications store (as in HomePage),
// the table renders correctly.
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ApplicationTable from './ApplicationTable';
import type { JobApplication } from '../types/applications';
import type { TableColumn } from '../types/table';

const mockApplications: JobApplication[] = [
  {
    id: 'store-1',
    position: 'Frontend Dev',
    company: 'Store Corp',
    status: 'Interviewing',
    salary: '120k',
    applicationDate: '2024-02-01',
    interviewDate: '2024-02-15',
    platform: 'LinkedIn',
    contactName: '',
    followUpDate: '',
    notes: '',
    link: 'https://store.example.com/job',
    timeline: [],
  },
  {
    id: 'store-2',
    position: 'Backend Dev',
    company: 'Zustand Inc',
    status: 'Applied',
    salary: '',
    applicationDate: '2024-02-10',
    interviewDate: '',
    platform: 'Indeed',
    contactName: '',
    followUpDate: '',
    notes: '',
    link: '',
    timeline: [],
  },
];

const mockApplicationsState = vi.hoisted(() => ({
  applications: [] as JobApplication[],
  deleteApplication: vi.fn(),
}));

vi.mock('../stores/applicationsStore', () => ({
  useApplicationsStore: (selector: (s: typeof mockApplicationsState) => unknown) =>
    selector(mockApplicationsState),
}));

vi.mock('dompurify', () => ({
  default: { sanitize: (html: string) => html },
}));

vi.mock('../utils/localStorage', () => ({
  sanitizeUrl: (url: string) => url,
}));

const columns: TableColumn[] = [
  { id: 'position', label: 'Position' },
  { id: 'company', label: 'Company' },
  { id: 'status', label: 'Status' },
  { id: 'platform', label: 'Platform' },
];

describe('ApplicationTable + Zustand store integration', () => {
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockApplicationsState.applications = [...mockApplications];
  });

  it('renders applications from store when passed as data (store-driven flow)', () => {
    render(
      <ApplicationTable
        columns={columns}
        data={mockApplicationsState.applications}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    // Data appears in both mobile cards and desktop table
    expect(screen.getAllByText('Frontend Dev').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Store Corp').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Backend Dev').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Zustand Inc').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Interviewing').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Applied').length).toBeGreaterThan(0);
  });

  it('calls onEdit when row is clicked (store data)', () => {
    render(
      <ApplicationTable
        columns={columns}
        data={mockApplicationsState.applications}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const row = screen.getByTestId('row-store-1');
    const firstCell = row.querySelector('td');
    expect(firstCell).toBeInTheDocument();
    if (firstCell) {
      fireEvent.click(firstCell);
      expect(mockOnEdit).toHaveBeenCalledWith(mockApplications[0]);
    }
  });

  it('calls onDelete when delete is confirmed (store data)', async () => {
    render(
      <ApplicationTable
        columns={columns}
        data={mockApplicationsState.applications}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    // Mobile card always shows delete; desktop shows on hover. Use first delete button.
    const deleteButtons = screen.getAllByTestId('delete-btn-store-1');
    expect(deleteButtons.length).toBeGreaterThan(0);
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Delete Application/i)).toBeInTheDocument();
    });

    const confirmButtons = screen.getAllByText('Delete');
    const dialogConfirm = confirmButtons[confirmButtons.length - 1];
    fireEvent.click(dialogConfirm);

    expect(mockOnDelete).toHaveBeenCalledWith(mockApplications[0]);
  });

  it('shows empty state when store has no applications', () => {
    mockApplicationsState.applications = [];

    render(
      <ApplicationTable
        columns={columns}
        data={mockApplicationsState.applications}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const emptyMessages = screen.getAllByText(/Use the "\+ Add Entry" button to start tracking your applications!/i);
    expect(emptyMessages.length).toBeGreaterThan(0);
  });
});
