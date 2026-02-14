// src/components/ApplicationTableRow.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ApplicationTableRow from './ApplicationTableRow';
import type { TableColumn } from '../types/table';
import type { ApplicationWithMetadata } from '../hooks/useFilteredApplications';

vi.mock('dompurify', () => ({
  default: { sanitize: (html: string) => html },
}));

vi.mock('../utils/localStorage', () => ({
  sanitizeUrl: (url: string) => url,
}));

const columnToKeyMap: Record<string, keyof ApplicationWithMetadata> = {
  position: 'position',
  company: 'company',
  salary: 'salary',
  status: 'status',
  applicationdate: 'applicationDate',
  interviewdate: 'interviewDate',
  platform: 'platform',
  contactname: 'contactName',
  followupdate: 'followUpDate',
  notes: 'notes',
  link: 'link',
};

const getCellValue = (item: ApplicationWithMetadata, columnId: string): string => {
  const n = columnId.toLowerCase().replace(/ /g, '').replace(/-/g, '');
  const key = columnToKeyMap[n];
  return key ? String(item[key] ?? '') : '';
};

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
  searchMetadata: 'software engineer tech corp applied linkedin test notes',
  translatedStatus: 'Applied',
  translatedPlatform: 'LinkedIn',
  translatedWorkType: '',
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
            getCellValue={getCellValue}
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
            getCellValue={getCellValue}
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

  it('always renders delete button (CSS handles visibility)', () => {
    render(
      <table>
        <tbody>
          <ApplicationTableRow
            item={mockApplication}
            columns={columns}
            onEdit={mockOnEdit}
            onDeleteRequest={mockOnDeleteRequest}
            getCellValue={getCellValue}
          />
        </tbody>
      </table>
    );

    const deleteBtn = screen.getByTestId('delete-btn-1');
    expect(deleteBtn).toBeInTheDocument();
    expect(deleteBtn).toHaveClass('opacity-0');
    expect(deleteBtn).toHaveClass('group-hover:opacity-100');
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
            getCellValue={getCellValue}
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
            getCellValue={getCellValue}
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
            getCellValue={getCellValue}
          />
        </tbody>
      </table>
    );

    expect(
      screen.getByRole('button', { name: /delete application for software engineer/i })
    ).toBeInTheDocument();
  });
});
