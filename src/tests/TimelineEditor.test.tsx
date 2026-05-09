import { render, screen, fireEvent } from '@testing-library/react';
import { expect, test, describe, beforeEach, vi } from 'vitest';
import TimelineEditor from '../components/TimelineEditor';
import type { InterviewEvent } from '../types/applications';

// Mock localStorage utilities
vi.mock('../storage/preferences', () => ({
  generateId: vi.fn(() => `test-id-${Math.random().toString(36).substr(2, 9)}`),
  getPreferences: vi.fn(() => ({
    enabledFields: ['position', 'company', 'salary', 'status', 'applicationdate', 'interviewdate', 'platform', 'contactname', 'followupdate', 'notes', 'link'],
    customFields: [],
    columnOrder: ['position', 'company', 'salary', 'status', 'applicationdate', 'interviewdate', 'platform', 'contactname', 'followupdate', 'notes', 'link'],
    defaultView: 'table',
    dateFormat: 'YYYY-MM-DD',
    customInterviewEvents: [],
  })),
}));

// Mock window.confirm
const confirmMock = vi.fn(() => true);
window.confirm = confirmMock;

describe('TimelineEditor Component', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    confirmMock.mockReturnValue(true);
  });

  test('should render empty state when no events', () => {
    render(<TimelineEditor events={[]} onChange={mockOnChange} />);
    expect(screen.getByText(/No timeline events yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Event/i })).toBeInTheDocument();
  });

  test('should render existing events', () => {
    const events: InterviewEvent[] = [
      {
        id: '1',
        type: 'application_submitted',
        date: '2025-01-15',
        status: 'completed',
      },
      {
        id: '2',
        type: 'technical_interview',
        date: '2025-01-20',
        status: 'scheduled',
        notes: 'Great interview!',
      },
    ];

    render(<TimelineEditor events={events} onChange={mockOnChange} />);
    
    expect(screen.getByText('Application Submitted')).toBeInTheDocument();
    expect(screen.getByText('Technical Interview')).toBeInTheDocument();
    expect(screen.getByText('"Great interview!"')).toBeInTheDocument();
  });

  test('should allow adding a new event', () => {
    render(<TimelineEditor events={[]} onChange={mockOnChange} />);
    
    const addButton = screen.getByText('+ Add Event');
    fireEvent.click(addButton);
    
    // Check if form is visible
    expect(screen.getByLabelText(/Stage Type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Status/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Notes/i)).toBeInTheDocument();
  });

  test('should call onChange when adding event', () => {
    render(<TimelineEditor events={[]} onChange={mockOnChange} />);
    
    fireEvent.click(screen.getByText('+ Add Event'));
    
    const dateInput = screen.getByLabelText(/Date/i);
    const saveButton = screen.getByRole('button', { name: /Save/i });
    
    fireEvent.change(dateInput, { target: { value: '2025-01-25' } });
    fireEvent.click(saveButton);
    
    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          date: '2025-01-25',
          type: 'application_submitted',
        }),
      ])
    );
  });

  test('should allow editing an event', () => {
    const events: InterviewEvent[] = [
      {
        id: '1',
        type: 'application_submitted',
        date: '2025-01-15',
        status: 'completed',
      },
    ];

    render(<TimelineEditor events={events} onChange={mockOnChange} />);
    
    const editButton = screen.getByRole('button', { name: /Edit/i });
    fireEvent.click(editButton);
    
    expect(screen.getByLabelText(/Stage Type/i)).toBeInTheDocument();
  });

  test('should allow deleting an event', () => {
    const events: InterviewEvent[] = [
      {
        id: '1',
        type: 'application_submitted',
        date: '2025-01-15',
        status: 'completed',
      },
    ];

    render(<TimelineEditor events={events} onChange={mockOnChange} />);
    
    const deleteButton = screen.getByRole('button', { name: /Delete/i });
    fireEvent.click(deleteButton);
    
    // Confirm dialog should appear
    expect(confirmMock).toHaveBeenCalled();
  });

  test('should sort events by date', () => {
    const events: InterviewEvent[] = [
      {
        id: '2',
        type: 'technical_interview',
        date: '2025-01-20',
        status: 'scheduled',
      },
      {
        id: '1',
        type: 'application_submitted',
        date: '2025-01-15',
        status: 'completed',
      },
    ];

    render(<TimelineEditor events={events} onChange={mockOnChange} />);
    
    const renderedEvents = screen.getAllByText(/Application Submitted|Technical Interview/i);
    // First one should be Application Submitted (earlier date)
    expect(renderedEvents[0]).toHaveTextContent('Application Submitted');
  });

  test('should display and save interviewer name', () => {
    const events: InterviewEvent[] = [
      {
        id: '1',
        type: 'technical_interview',
        date: '2025-01-20',
        status: 'scheduled',
        interviewerName: 'John Doe',
      },
    ];

    render(<TimelineEditor events={events} onChange={mockOnChange} />);
    
    // Should display interviewer name
    expect(screen.getByText('👤 John Doe')).toBeInTheDocument();
    
    // Should include interviewer name when editing
    const editButton = screen.getByRole('button', { name: /Edit/i });
    fireEvent.click(editButton);
    
    const interviewerInput = screen.getByLabelText(/Interviewer Name/i);
    expect(interviewerInput).toHaveValue('John Doe');
    
    fireEvent.change(interviewerInput, { target: { value: 'Jane Smith' } });
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));
    
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          interviewerName: 'Jane Smith',
        }),
      ])
    );
  });
});

