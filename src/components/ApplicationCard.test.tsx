// src/components/ApplicationCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ApplicationCard from './ApplicationCard';
import type { JobApplication } from '../types/applications';
import type { TableColumn } from '../types/table';

vi.mock('dompurify', () => ({
  default: { sanitize: (html: string) => html },
}));

vi.mock('../utils/localStorage', () => ({
  sanitizeUrl: (url: string) => url,
}));

const columnToKeyMap: Record<string, keyof JobApplication> = {
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

const getCellValue = (item: JobApplication, columnId: string): string => {
  const normalized = columnId.toLowerCase().replace(/ /g, '').replace(/-/g, '');
  const key = columnToKeyMap[normalized];
  return key ? String(item[key] ?? '') : '';
};

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

describe('ApplicationCard', () => {
  const mockOnEdit = vi.fn();
  const mockOnDeleteRequest = vi.fn();
  const otherColumns: TableColumn[] = [
    { id: 'salary', label: 'Salary' },
    { id: 'applicationDate', label: 'Application Date' },
    { id: 'link', label: 'Link' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders position and company prominently', () => {
    render(
      <ApplicationCard
        item={mockApplication}
        otherColumns={otherColumns}
        onEdit={mockOnEdit}
        onDeleteRequest={mockOnDeleteRequest}
        getCellValue={getCellValue}
      />
    );

    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('Tech Corp')).toBeInTheDocument();
  });

  it('renders status badge', () => {
    render(
      <ApplicationCard
        item={mockApplication}
        otherColumns={otherColumns}
        onEdit={mockOnEdit}
        onDeleteRequest={mockOnDeleteRequest}
        getCellValue={getCellValue}
      />
    );

    expect(screen.getByText('Applied')).toBeInTheDocument();
  });

  it('calls onEdit when card is clicked', () => {
    render(
      <ApplicationCard
        item={mockApplication}
        otherColumns={otherColumns}
        onEdit={mockOnEdit}
        onDeleteRequest={mockOnDeleteRequest}
        getCellValue={getCellValue}
      />
    );

    const card = screen.getByTestId('card-1');
    fireEvent.click(card);

    expect(mockOnEdit).toHaveBeenCalledTimes(1);
    expect(mockOnEdit).toHaveBeenCalledWith(mockApplication);
  });

  it('calls onDeleteRequest when delete button is clicked and stops propagation', () => {
    render(
      <ApplicationCard
        item={mockApplication}
        otherColumns={otherColumns}
        onEdit={mockOnEdit}
        onDeleteRequest={mockOnDeleteRequest}
        getCellValue={getCellValue}
      />
    );

    const deleteBtn = screen.getByTestId('delete-btn-1');
    fireEvent.click(deleteBtn);

    expect(mockOnDeleteRequest).toHaveBeenCalledTimes(1);
    expect(mockOnDeleteRequest).toHaveBeenCalledWith(mockApplication);
  });

  it('renders other columns (e.g. Salary, Link) when provided', () => {
    render(
      <ApplicationCard
        item={mockApplication}
        otherColumns={otherColumns}
        onEdit={mockOnEdit}
        onDeleteRequest={mockOnDeleteRequest}
        getCellValue={getCellValue}
      />
    );

    expect(screen.getByText('100k')).toBeInTheDocument();
    const links = screen.getAllByRole('link');
    const jobLink = links.find((l) => l.getAttribute('href') === 'https://example.com/job');
    expect(jobLink).toBeDefined();
    expect(jobLink).toBeInTheDocument();
  });

  it('displays fallbacks for missing position, company, status', () => {
    const emptyApp: JobApplication = {
      ...mockApplication,
      id: '2',
      position: '',
      company: '',
      status: '',
    };

    render(
      <ApplicationCard
        item={emptyApp}
        otherColumns={otherColumns}
        onEdit={mockOnEdit}
        onDeleteRequest={mockOnDeleteRequest}
        getCellValue={getCellValue}
      />
    );

    expect(screen.getByText('No Position')).toBeInTheDocument();
    expect(screen.getByText('No Company')).toBeInTheDocument();
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('has correct aria-label on delete button', () => {
    render(
      <ApplicationCard
        item={mockApplication}
        otherColumns={otherColumns}
        onEdit={mockOnEdit}
        onDeleteRequest={mockOnDeleteRequest}
        getCellValue={getCellValue}
      />
    );

    expect(
      screen.getByRole('button', { name: /delete application for software engineer/i })
    ).toBeInTheDocument();
  });
});
