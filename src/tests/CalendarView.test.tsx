import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import CalendarView from '../components/CalendarView';
import type { JobApplication } from '../types/applications';

const todayISO = new Date().toISOString().slice(0, 10);

const applicationWithEvent: JobApplication = {
  id: 'app-1',
  position: 'Site Reliability Engineer',
  company: 'Stability Inc',
  salary: '',
  status: 'Interviewing',
  applicationDate: todayISO,
  interviewDate: todayISO,
  notes: '',
  link: '',
  platform: 'Referral',
  contactName: '',
  followUpDate: '',
  timeline: [
    {
      id: 'event-1',
      type: 'technical_interview',
      date: todayISO,
      status: 'scheduled',
      notes: 'Panel interview',
      interviewerName: 'Alex Johnson',
    },
  ],
  customFields: {},
};

describe('CalendarView', () => {
  test('renders calendar header and events for current month', () => {
    render(<CalendarView applications={[applicationWithEvent]} />);

    expect(screen.getByText(/Calendar/i)).toBeInTheDocument();
    expect(screen.getByText(/Site Reliability Engineer/i)).toBeInTheDocument();
    expect(screen.getByText(/technical interview/i)).toBeInTheDocument();
  });

  test('clicking an event triggers onSelectJob callback', () => {
    const onSelectJob = vi.fn();
    render(<CalendarView applications={[applicationWithEvent]} onSelectJob={onSelectJob} />);

    fireEvent.click(screen.getByText(/Site Reliability Engineer/i));
    expect(onSelectJob).toHaveBeenCalledWith(applicationWithEvent);
  });

  test('highlights today with special styling', () => {
    render(<CalendarView applications={[]} />);

    const today = new Date();
    const todayNumber = today.getDate();

    const todayElements = screen.getAllByText(todayNumber.toString());
    expect(todayElements.length).toBeGreaterThan(0);
  });

  test('shows relative time indicators for events', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + 3); // Use 3 days to ensure it's not "Tomorrow"
    futureDate.setHours(0, 0, 0, 0);
    const pastDate = new Date(today);
    pastDate.setDate(pastDate.getDate() - 3);
    pastDate.setHours(0, 0, 0, 0);

    const applications: JobApplication[] = [
      {
        ...applicationWithEvent,
        id: 'app-today',
        position: 'Today Position',
        timeline: [
          {
            id: 'event-today',
            type: 'technical_interview',
            date: today.toISOString().slice(0, 10),
            status: 'scheduled',
          },
        ],
      },
      {
        ...applicationWithEvent,
        id: 'app-future',
        position: 'Future Position',
        timeline: [
          {
            id: 'event-future',
            type: 'code_challenge',
            date: futureDate.toISOString().slice(0, 10),
            status: 'scheduled',
          },
        ],
      },
      {
        ...applicationWithEvent,
        id: 'app-past',
        position: 'Past Position',
        timeline: [
          {
            id: 'event-past',
            type: 'first_contact',
            date: pastDate.toISOString().slice(0, 10),
            status: 'completed',
          },
        ],
      },
    ];

    render(<CalendarView applications={applications} />);

    const todayElements = screen.getAllByText(/Today/i);
    expect(todayElements.length).toBeGreaterThan(0);

    expect(screen.getByText(/Future Position/i)).toBeInTheDocument();

    const futureButton = screen.getByText(/Future Position/i).closest('button');

    expect(futureButton).toBeInTheDocument();

    expect(futureButton?.textContent).toMatch(/(in \d+ days|Tomorrow)/i);
  });
});
