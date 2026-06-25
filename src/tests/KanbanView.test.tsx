import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import KanbanView from '../components/KanbanView';
import type { JobApplication } from '../types/applications';
import type { ApplicationWithMetadata } from '../types/applications';

const makeApplication = (overrides: Partial<ApplicationWithMetadata>): ApplicationWithMetadata => ({
  id: overrides.id ?? 'id-1',
  position: overrides.position ?? 'Frontend Developer',
  company: overrides.company ?? 'Tech Corp',
  status: overrides.status ?? 'Applied',
  applicationDate: overrides.applicationDate ?? '2025-01-10',
  interviewDate: overrides.interviewDate ?? '',
  platform: overrides.platform ?? 'LinkedIn',
  contactName: overrides.contactName ?? '',
  followUpDate: overrides.followUpDate ?? '',
  notes: overrides.notes ?? '',
  link: overrides.link ?? '',
  salary: overrides.salary ?? '',
  timeline: overrides.timeline ?? [],
  customFields: overrides.customFields,
  parsedApplicationDate: null,
  searchMetadata: '',
  translatedStatus: overrides.status ?? 'Applied',
  translatedPlatform: overrides.platform ?? '',
  translatedWorkType: '',
  interviewingSubStatus: overrides.interviewingSubStatus ?? null,
});

describe('KanbanView', () => {
  test('groups applications by status and shows counts', () => {
    const applications: JobApplication[] = [
      makeApplication({ id: '1', status: 'Applied', position: 'Frontend Dev' }),
      makeApplication({ id: '2', status: 'Applied', position: 'Backend Dev' }),
      makeApplication({ id: '3', status: 'Offer', position: 'Data Scientist' }),
    ];

    render(<KanbanView applications={applications} />);

    expect(screen.getByText('Applied')).toBeInTheDocument();
    expect(screen.getByText('Offer')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // badge with count for Applied
    expect(screen.getByText('1')).toBeInTheDocument(); // badge with count for Offer
    expect(screen.getByText(/Frontend Dev/)).toBeInTheDocument();
    expect(screen.getByText(/Backend Dev/)).toBeInTheDocument();
    expect(screen.getByText(/Data Scientist/)).toBeInTheDocument();
  });

  test('triggers select and delete callbacks', () => {
    const onSelectJob = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const applications: JobApplication[] = [
      makeApplication({ id: 'app-1', status: 'Applied', position: 'Fullstack Eng' }),
    ];

    render(<KanbanView applications={applications} onSelectJob={onSelectJob} onEdit={onEdit} onDelete={onDelete} />);

    fireEvent.click(screen.getByText(/Fullstack Eng/));
    expect(onSelectJob).toHaveBeenCalledWith(applications[0]);

    const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
    fireEvent.click(deleteButtons[0]);
    
    expect(screen.getByText(/Delete Application/i)).toBeInTheDocument();
    
    const confirmButtons = screen.getAllByRole('button', { name: /Delete/i });
    const confirmButton = confirmButtons[confirmButtons.length - 1];
    fireEvent.click(confirmButton);
    
    expect(onDelete).toHaveBeenCalledWith(applications[0]);
  });

  test('groups Interviewing applications by timeline sub-status', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const futureDate1 = new Date(today);
    futureDate1.setDate(futureDate1.getDate() + 5);
    const futureDate2 = new Date(today);
    futureDate2.setDate(futureDate2.getDate() + 10);
    const pastDate = new Date(today);
    pastDate.setDate(pastDate.getDate() - 5);

    const applications: ApplicationWithMetadata[] = [
      makeApplication({
        id: '1',
        status: 'Interviewing',
        position: 'Frontend Dev',
        interviewingSubStatus: 'First Contact',
        timeline: [
          {
            id: 'event-1',
            type: 'first_contact',
            date: futureDate1.toISOString().slice(0, 10),
            status: 'scheduled',
          },
        ],
      }),
      makeApplication({
        id: '2',
        status: 'Interviewing',
        position: 'Backend Dev',
        interviewingSubStatus: 'Code Challenge',
        timeline: [
          {
            id: 'event-2',
            type: 'code_challenge',
            date: futureDate2.toISOString().slice(0, 10),
            status: 'pending',
          },
        ],
      }),
      makeApplication({
        id: '3',
        status: 'Interviewing',
        position: 'Fullstack Dev',
        interviewingSubStatus: 'Technical Interview',
        timeline: [
          {
            id: 'event-3',
            type: 'technical_interview',
            date: pastDate.toISOString().slice(0, 10),
            status: 'completed',
          },
        ],
      }),
    ];

    render(<KanbanView applications={applications} />);

    expect(screen.getByText('Interviewing - First Contact')).toBeInTheDocument();
    expect(screen.getByText('Interviewing - Code Challenge')).toBeInTheDocument();
    expect(screen.getByText('Interviewing - Technical Interview')).toBeInTheDocument();
    
    expect(screen.getByText(/Frontend Dev/)).toBeInTheDocument();
    expect(screen.getByText(/Backend Dev/)).toBeInTheDocument();
    expect(screen.getByText(/Fullstack Dev/)).toBeInTheDocument();
  });

  test('handles Interviewing applications without timeline as regular Interviewing', () => {
    const applications: JobApplication[] = [
      makeApplication({
        id: '1',
        status: 'Interviewing',
        position: 'DevOps Eng',
        timeline: [],
      }),
    ];

    render(<KanbanView applications={applications} />);

    expect(screen.getByText('Interviewing')).toBeInTheDocument();
    expect(screen.getByText(/DevOps Eng/)).toBeInTheDocument();
  });
});
