// src/components/ApplicationTableRow.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ApplicationTableRow from './ApplicationTableRow';
import { type JobApplication, type ApplicationWithMetadata } from '../types/applications';
import { getCellValue } from '../utils/applications';
import type { TableColumn } from '../types/table';

vi.mock('dompurify', () => ({
  default: { sanitize: (html: string) => html },
}));

vi.mock('../utils/localStorage', () => ({
  sanitizeUrl: (url: string) => url,
}));

const mockApplication: ApplicationWithMetadata = {
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
  parsedApplicationDate: new Date('2024-01-01'),
  searchMetadata: '',
  translatedStatus: 'Applied',
  translatedPlatform: 'LinkedIn',
  translatedWorkType: '',
  interviewingSubStatus: null,
};

describe('ApplicationTableRow', () => {
  const mockOnEdit = vi.fn();
  const mockOnDeleteRequest = vi.fn();
  const columns: TableColumn[] = [
    { id: 'position', label: 'Position' },
    { id: 'company', label: 'Company' },
    { id: 'status', label: 'Status' },
    { id: 'link', label: 'Link' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders cells for each column', () => {
    render(
      <table>
        <tbody>
          <ApplicationTableRow
            item={mockApplication}
            columns={columns}
            onEdit={mockOnEdit}
            onDeleteRequest={mockOnDeleteRequest}
          />
        </tbody>
      </table>
    );

    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('Tech Corp')).toBeInTheDocument();
    expect(screen.getByText('Applied')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'https://example.com/job' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://example.com/job');
  });

  it('calls onEdit when a cell is clicked', () => {
    render(
      <table>
        <tbody>
          <ApplicationTableRow
            item={mockApplication}
            columns={columns}
            onEdit={mockOnEdit}
            onDeleteRequest={mockOnDeleteRequest}
          />
        </tbody>
      </table>
    );

    const cell = screen.getByText('Software Engineer').closest('td');
    expect(cell).toBeInTheDocument();
    if (cell) {
      fireEvent.click(cell);
      expect(mockOnEdit).toHaveBeenCalledWith(mockApplication);
    }
  });

  it('has delete button in the document (visible on hover via CSS)', () => {
    render(
      <table>
        <tbody>
          <ApplicationTableRow
            item={mockApplication}
            columns={columns}
            onEdit={mockOnEdit}
            onDeleteRequest={mockOnDeleteRequest}
          />
        </tbody>
      </table>
    );

    expect(screen.getByTestId('delete-btn-1')).toBeInTheDocument();
  });

  it('calls onDeleteRequest when delete button is clicked', () => {
    render(
      <table>
        <tbody>
          <ApplicationTableRow
            item={mockApplication}
            columns={columns}
            onEdit={mockOnEdit}
            onDeleteRequest={mockOnDeleteRequest}
          />
        </tbody>
      </table>
    );

    const deleteBtn = screen.getByTestId('delete-btn-1');
    fireEvent.click(deleteBtn);

    expect(mockOnDeleteRequest).toHaveBeenCalledWith(mockApplication);
  });

  it('renders link with target _blank and rel noopener noreferrer', () => {
    render(
      <table>
        <tbody>
          <ApplicationTableRow
            item={mockApplication}
            columns={[{ id: 'link', label: 'Link' }]}
            onEdit={mockOnEdit}
            onDeleteRequest={mockOnDeleteRequest}
          />
        </tbody>
      </table>
    );

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('has correct aria-label on delete button', () => {
    render(
      <table>
        <tbody>
          <ApplicationTableRow
            item={mockApplication}
            columns={columns}
            onEdit={mockOnEdit}
            onDeleteRequest={mockOnDeleteRequest}
          />
        </tbody>
      </table>
    );

    expect(
      screen.getByRole('button', { name: /delete application for software engineer/i })
    ).toBeInTheDocument();
  });
});
