import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ApplicationCard from './ApplicationCard';
import ApplicationTableRow from './ApplicationTableRow';
import type { ApplicationWithMetadata } from '../types/applications';
import type { TableColumn } from '../types/table';

const application: ApplicationWithMetadata = {
  id: 'keyboard-1',
  position: 'Software Engineer',
  company: 'Tech Corp',
  status: 'Applied',
  salary: '',
  applicationDate: '2024-01-01',
  interviewDate: '',
  platform: 'LinkedIn',
  contactName: '',
  followUpDate: '',
  notes: '',
  link: '',
  timeline: [],
  parsedApplicationDate: new Date('2024-01-01'),
  searchMetadata: '',
  translatedStatus: 'Applied',
  translatedPlatform: 'LinkedIn',
  translatedWorkType: '',
  interviewingSubStatus: null,
};

const columns: TableColumn[] = [
  { id: 'position', label: 'Position' },
  { id: 'company', label: 'Company' },
];

describe('application keyboard access', () => {
  beforeEach(() => vi.clearAllMocks());

  it('activates the mobile application card with its native button', () => {
    const onSelectJob = vi.fn();
    render(
      <ApplicationCard
        item={application}
        otherColumns={[]}
        onSelectJob={onSelectJob}
        onEdit={vi.fn()}
        onDeleteRequest={vi.fn()}
      />,
    );

    const card = screen.getByTestId('card-keyboard-1');
    expect(card).not.toHaveAttribute('role', 'button');
    expect(card).not.toHaveAttribute('tabindex');

    const selectButton = screen.getByRole('button', { name: 'Software Engineer at Tech Corp' });
    fireEvent.click(selectButton);

    expect(onSelectJob).toHaveBeenCalledTimes(1);
  });

  it('keeps a native selection button when the position column is hidden', () => {
    const onSelectJob = vi.fn();
    render(
      <table>
        <tbody>
          <ApplicationTableRow
            item={application}
            columns={[{ id: 'company', label: 'Company' }]}
            onSelectJob={onSelectJob}
            onEdit={vi.fn()}
            onDeleteRequest={vi.fn()}
          />
        </tbody>
      </table>,
    );

    expect(screen.getByRole('button', { name: 'Software Engineer at Tech Corp' })).toBeInTheDocument();
  });

  it('activates the table row through a native button in the primary cell', () => {
    const onSelectJob = vi.fn();
    render(
      <table>
        <tbody>
          <ApplicationTableRow
            item={application}
            columns={columns}
            onSelectJob={onSelectJob}
            onEdit={vi.fn()}
            onDeleteRequest={vi.fn()}
          />
        </tbody>
      </table>,
    );

    const row = screen.getByTestId('row-keyboard-1');
    expect(row).not.toHaveAttribute('tabindex');
    expect(row).not.toHaveAttribute('aria-label');

    const selectButton = screen.getByRole('button', { name: 'Software Engineer at Tech Corp' });
    fireEvent.click(selectButton);
    fireEvent.click(selectButton);

    expect(onSelectJob).toHaveBeenCalledTimes(2);
  });
});
