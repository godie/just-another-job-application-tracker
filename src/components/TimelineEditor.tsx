import React, { useState, useMemo, useReducer } from 'react';
import type { InterviewEvent, InterviewStageType, EventStatus } from '../types/applications';
import { generateId } from '../utils/id';
import { parseLocalDate } from '../utils/date';
import { usePreferencesStore } from '../stores/preferencesStore';
import { Button } from './ui/Button';

interface TimelineEditorProps {
  events: InterviewEvent[];
  onChange: (events: InterviewEvent[]) => void;
}

const TIMELINE_EVENT_STATUS_OPTIONS: { value: EventStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const TimelineEditor: React.FC<TimelineEditorProps> = ({ events, onChange }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const preferences = usePreferencesStore((state) => state.preferences);

  const stageOptions: { value: InterviewStageType | string; label: string; isCustom?: boolean }[] = useMemo(() => {
    const baseOptions: { value: InterviewStageType; label: string }[] = [
      { value: 'application_submitted', label: 'Application Submitted' },
      { value: 'screener_call', label: 'Screener Call' },
      { value: 'first_contact', label: 'First Contact' },
      { value: 'technical_interview', label: 'Technical Interview' },
      { value: 'code_challenge', label: 'Code Challenge' },
      { value: 'live_coding', label: 'Live Coding' },
      { value: 'hiring_manager', label: 'Hiring Manager' },
      { value: 'system_design', label: 'System Design' },
      { value: 'cultural_fit', label: 'Cultural Fit' },
      { value: 'final_round', label: 'Final Round' },
      { value: 'offer', label: 'Offer' },
      { value: 'rejected', label: 'Rejected' },
      { value: 'withdrawn', label: 'Withdrawn' },
      { value: 'custom', label: 'Custom' },
    ];

    const customEvents = (preferences.customInterviewEvents || []).map(event => ({
      value: `custom:${event.id}`,
      label: event.label,
      isCustom: true,
    }));

    return [...baseOptions, ...customEvents];
  }, [preferences.customInterviewEvents]);

  const handleAddEvent = (type: InterviewStageType, date: string, status: EventStatus, notes: string, interviewerName: string, customTypeName?: string) => {
    const newEvent: InterviewEvent = {
      id: generateId(),
      type,
      date,
      status,
      notes: notes || undefined,
      interviewerName: interviewerName || undefined,
      customTypeName: type === 'custom' && customTypeName ? customTypeName : undefined,
    };
    onChange([...events, newEvent]);
    setIsAdding(false);
  };

  const handleUpdateEvent = (id: string, type: InterviewStageType, date: string, status: EventStatus, notes: string, interviewerName: string, customTypeName?: string) => {
    const updated = events.map(event =>
      event.id === id ? { 
        ...event, 
        type, 
        date, 
        status, 
        notes: notes || undefined, 
        interviewerName: interviewerName || undefined,
        customTypeName: type === 'custom' && customTypeName ? customTypeName : undefined,
      } : event
    );
    onChange(updated);
    setEditingId(null);
  };

  const handleDeleteEvent = (id: string) => {
    if (confirm('Are you sure you want to delete this timeline event?')) {
      onChange(events.filter(event => event.id !== id));
    }
  };

  const sortedEvents = events.toSorted((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Interview Timeline</h3>
        {!isAdding && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setIsAdding(true)}
          >
            + Add Event
          </Button>
        )}
      </div>

      {/* Timeline List */}
      <div className="space-y-2">
        {sortedEvents.map((event) => (
          <div key={event.id} className="bg-muted border border-border rounded p-3">
            {editingId === event.id ? (
              <EventForm
                event={event}
                stageOptions={stageOptions}
                statusOptions={TIMELINE_EVENT_STATUS_OPTIONS}
                onSave={(type, date, status, notes, interviewerName, customTypeName) => handleUpdateEvent(event.id, type, date, status, notes, interviewerName, customTypeName)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className='flex items-center gap-x-2'>
                    <span className='font-medium text-foreground'>
                      {event.type === 'custom' && event.customTypeName 
                        ? event.customTypeName 
                        : stageOptions.find(opt => opt.value === event.type || (opt.isCustom && event.customTypeName === opt.label))?.label || event.type}
                    </span>
                    <span className='text-sm text-muted-foreground'>{event.date}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      event.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200' :
                      event.status === 'scheduled' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200' :
                      event.status === 'cancelled' ? 'bg-muted text-foreground dark:bg-muted dark:text-foreground' :
                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200'
                    }`}>
                      {event.status}
                    </span>
                  </div>
                  {event.interviewerName && (
                    <p className='text-sm text-primary mt-1 font-medium'>
                      👤 {event.interviewerName}
                    </p>
                  )}
                  {event.notes && (
                    <p className='text-sm text-muted-foreground mt-1 italic'>"{event.notes}"</p>
                  )}
                </div>
                <div className='flex gap-x-2'>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={() => setEditingId(event.id)}
                    className='text-primary hover:text-primary/80'
                  >
                    Edit
                  </Button>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={() => handleDeleteEvent(event.id)}
                    className='text-destructive hover:text-destructive/80'
                  >
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Add Event Form */}
        {isAdding && (
          <EventForm
            stageOptions={stageOptions}
            statusOptions={TIMELINE_EVENT_STATUS_OPTIONS}
            onSave={(type, date, status, notes, interviewerName, customTypeName) => handleAddEvent(type, date, status, notes, interviewerName, customTypeName)}
            onCancel={() => setIsAdding(false)}
          />
        )}

        {events.length === 0 && !isAdding && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No timeline events yet. Click "+ Add Event" to get started.
          </p>
        )}
      </div>
    </div>
  );
};

interface EventFormProps {
  event?: InterviewEvent;
  stageOptions: { value: InterviewStageType | string; label: string; isCustom?: boolean }[];
  statusOptions: { value: EventStatus; label: string }[];
  onSave: (type: InterviewStageType, date: string, status: EventStatus, notes: string, interviewerName: string, customTypeName?: string) => void;
  onCancel: () => void;
}

interface EventFormState {
  type: InterviewStageType | string;
  date: string;
  status: EventStatus;
  notes: string;
  customType: string;
  interviewerName: string;
}

type EventFormAction =
  | { type: 'SET_FIELD'; field: keyof EventFormState; value: string | EventStatus }
  | { type: 'SET_TYPE'; value: string; customLabel?: string };

const eventFormReducer = (state: EventFormState, action: EventFormAction): EventFormState => {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SET_TYPE':
      return { ...state, type: action.value, customType: action.customLabel ?? (action.value === 'custom' ? state.customType : '') };
    default:
      return state;
  }
};

const EventForm: React.FC<EventFormProps> = ({ event, stageOptions, statusOptions, onSave, onCancel }) => {
  const [state, dispatch] = useReducer(eventFormReducer, undefined, () => {
    const getInitialType = (): InterviewStageType | string => {
      if (event?.customTypeName) {
        const customOption = stageOptions.find(opt => opt.isCustom && opt.label === event.customTypeName);
        if (customOption) {
          return customOption.value;
        }
      }
      return event?.type || 'application_submitted';
    };

    return {
      type: getInitialType(),
      date: event?.date || '',
      status: event?.status || 'scheduled',
      notes: event?.notes || '',
      customType: event?.customTypeName || '',
      interviewerName: event?.interviewerName || '',
    };
  });

  const { type, date, status, notes, customType, interviewerName } = state;

  const handleTypeChange = (newTypeValue: string) => {
    let customLabel: string | undefined;
    
    if (newTypeValue.startsWith('custom:')) {
      const customOption = stageOptions.find(opt => opt.value === newTypeValue);
      if (customOption) {
        customLabel = customOption.label;
      }
    } else if (newTypeValue === 'custom') {
      customLabel = state.customType;
    } else {
      customLabel = '';
    }

    dispatch({ type: 'SET_TYPE', value: newTypeValue, customLabel });
  };

  const handleSave = () => {
    const finalType: InterviewStageType = type.startsWith('custom:') ? 'custom' : (type as InterviewStageType);
    const finalCustomType = type.startsWith('custom:') || type === 'custom' ? customType : undefined;
    onSave(finalType, date, status, notes, interviewerName, finalCustomType);
  };

  return (
    <fieldset className="space-y-3" aria-label="Timeline event form">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label htmlFor="stage-type" className="block text-xs font-medium text-muted-foreground mb-1">Stage Type</label>
          <select
            id="stage-type"
            value={type}
            onChange={(e) => handleTypeChange(e.target.value)}
            aria-label="Stage Type"
            className='w-full text-sm rounded border-border shadow-sm focus:border-ring focus:ring-ring p-2 border bg-background text-foreground'
          >
            {stageOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.isCustom ? `⭐ ${opt.label}` : opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="event-date" className="block text-xs font-medium text-muted-foreground mb-1">Date</label>
          <input
            id="event-date"
            type="date"
            value={date}
            onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'date', value: e.target.value })}
            required
            aria-label="Date"
            className='w-full text-sm rounded border-border shadow-sm focus:border-ring focus:ring-ring p-2 border bg-background text-foreground'
          />
        </div>

        <div>
          <label htmlFor="event-status" className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
          <select
            id="event-status"
            value={status}
            onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'status', value: e.target.value as EventStatus })}
            aria-label="Status"
            className='w-full text-sm rounded border-border shadow-sm focus:border-ring focus:ring-ring p-2 border bg-background text-foreground'
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {(type === 'custom' || type.startsWith('custom:')) && (
        <div>
          <label htmlFor="custom-type-name" className="block text-xs font-medium text-muted-foreground mb-1">
            {type.startsWith('custom:') ? 'Event Name (from your custom events)' : 'Custom Type Name'}
          </label>
          <input
            id="custom-type-name"
            type="text"
            value={customType}
            onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'customType', value: e.target.value })}
            placeholder="Enter custom event name"
            disabled={type.startsWith('custom:')}
            aria-label="Custom Type Name"
            className={`w-full text-sm rounded border-border shadow-sm focus:border-ring focus:ring-ring p-2 border bg-background text-foreground ${
              type.startsWith('custom:') ? 'bg-muted' : ''
            }`}
          />
          {type.startsWith('custom:') && (
            <p className="text-xs text-muted-foreground mt-1">
              This event name is managed in Settings. To change it, go to Settings → Interview Events.
            </p>
          )}
        </div>
      )}
      <div>
        <label htmlFor="event-notes" className="block text-xs font-medium text-muted-foreground mb-1">Notes (optional)</label>
        <textarea
          id="event-notes"
          value={notes}
          onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'notes', value: e.target.value })}
          rows={2}
          aria-label="Notes"
          className='w-full text-sm rounded border-border shadow-sm focus:border-ring focus:ring-ring p-2 border bg-background text-foreground'
        />
      </div>
      <div>
        <label htmlFor="interviewer-name" className="block text-xs font-medium text-muted-foreground mb-1">Interviewer Name (optional)</label>
        <input
          id="interviewer-name"
          type="text"
          value={interviewerName}
          onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'interviewerName', value: e.target.value })}
          placeholder="John Doe"
          aria-label="Interviewer Name"
          className='w-full text-sm rounded border-border shadow-sm focus:border-ring focus:ring-ring p-2 border bg-background text-foreground'
        />
      </div>

      <div className="flex justify-end gap-x-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleSave}
        >
          Save
        </Button>
      </div>
    </fieldset>
  );
};

export default TimelineEditor;