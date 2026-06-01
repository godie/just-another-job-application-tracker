// src/components/TimelineEditor.tsx
import React, { useState, useMemo, useReducer } from 'react';
import type { InterviewEvent, InterviewStageType, EventStatus } from '../types/applications';
import { generateId } from '../utils/id';
import { parseLocalDate } from '../utils/date';
import { usePreferencesStore } from '../stores/preferencesStore';

interface TimelineEditorProps {
  events: InterviewEvent[];
  onChange: (events: InterviewEvent[]) => void;
}

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

    // Add custom interview events from user preferences
    const customEvents = (preferences.customInterviewEvents || []).map(event => ({
      value: `custom:${event.id}`,
      label: event.label,
      isCustom: true,
    }));

    return [...baseOptions, ...customEvents];
  }, [preferences.customInterviewEvents]);

  const statusOptions: { value: EventStatus; label: string }[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

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
        // Only include customTypeName if type is 'custom' and customTypeName is provided
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
        <h3 className="text-lg font-semibold text-earth-800 dark:text-earth-100">Interview Timeline</h3>
        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="text-sm px-3 py-1 bg-sage-600 text-white rounded hover:bg-sage-700 transition"
          >
            + Add Event
          </button>
        )}
      </div>

      {/* Timeline List */}
      <div className="space-y-2">
        {sortedEvents.map((event) => (
          <div key={event.id} className="bg-earth-50 border border-earth-200 rounded p-3">
            {editingId === event.id ? (
              <EventForm
                event={event}
                stageOptions={stageOptions}
                statusOptions={statusOptions}
                onSave={(type, date, status, notes, interviewerName, customTypeName) => handleUpdateEvent(event.id, type, date, status, notes, interviewerName, customTypeName)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div className="flex items-start justify-between">
                <div className="flex-1">
<div className='flex items-center gap-x-2'>
                     <span className='font-medium text-earth-900 dark:text-earth-100'>
                      {event.type === 'custom' && event.customTypeName 
                        ? event.customTypeName 
                        : stageOptions.find(opt => opt.value === event.type || (opt.isCustom && event.customTypeName === opt.label))?.label || event.type}
                    </span>
                    <span className='text-sm text-earth-600 dark:text-earth-400'>{event.date}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      event.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' :
                      event.status === 'scheduled' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' :
                      event.status === 'cancelled' ? 'bg-earth-200 text-earth-800 dark:bg-earth-600 dark:text-earth-200' :
                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
                    }`}>
                      {event.status}
                    </span>
                  </div>
                  {event.interviewerName && (
                    <p className='text-sm text-sage-600 dark:text-sage-400 mt-1 font-medium'>
                      👤 {event.interviewerName}
                    </p>
                  )}
                  {event.notes && (
                    <p className='text-sm text-earth-600 dark:text-earth-400 mt-1 italic'>"{event.notes}"</p>
                  )}
                </div>
<div className='flex gap-x-2'>
                   <button
                    type='button'
                    onClick={() => setEditingId(event.id)}
                    className='text-sage-600 hover:text-sage-800 dark:text-sage-400 dark:hover:text-sage-300 text-sm'
                  >
                    Edit
                  </button>
                  <button
                    type='button'
                    onClick={() => handleDeleteEvent(event.id)}
                    className='text-terracotta-600 hover:text-terracotta-800 dark:text-terracotta-400 dark:hover:text-terracotta-300 text-sm'
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Add Event Form */}
        {isAdding && (
          <EventForm
            stageOptions={stageOptions}
            statusOptions={statusOptions}
            onSave={(type, date, status, notes, interviewerName, customTypeName) => handleAddEvent(type, date, status, notes, interviewerName, customTypeName)}
            onCancel={() => setIsAdding(false)}
          />
        )}

        {events.length === 0 && !isAdding && (
          <p className="text-sm text-earth-500 dark:text-earth-400 text-center py-4">
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

  // Handle type change: if it's a custom event (custom:${id}), extract the label
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
          <label htmlFor="stage-type" className="block text-xs font-medium text-earth-700 dark:text-earth-300 mb-1">Stage Type</label>
          <select
            id="stage-type"
            value={type}
            onChange={(e) => handleTypeChange(e.target.value)}
            aria-label="Stage Type"
            className='w-full text-sm rounded border-earth-300 dark:border-earth-600 shadow-sm focus:border-sage-500 dark:focus:border-sage-400 focus:ring-sage-500 dark:focus:ring-sage-400 p-2 border bg-white dark:bg-earth-800 text-earth-900 dark:text-earth-100'
          >
            {stageOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.isCustom ? `⭐ ${opt.label}` : opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="event-date" className="block text-xs font-medium text-earth-700 dark:text-earth-300 mb-1">Date</label>
          <input
            id="event-date"
            type="date"
            value={date}
            onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'date', value: e.target.value })}
            required
            aria-label="Date"
            className='w-full text-sm rounded border-earth-300 dark:border-earth-600 shadow-sm focus:border-sage-500 dark:focus:border-sage-400 focus:ring-sage-500 dark:focus:ring-sage-400 p-2 border bg-white dark:bg-earth-800 text-earth-900 dark:text-earth-100'
          />
        </div>

        <div>
          <label htmlFor="event-status" className="block text-xs font-medium text-earth-700 dark:text-earth-300 mb-1">Status</label>
          <select
            id="event-status"
            value={status}
            onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'status', value: e.target.value as EventStatus })}
            aria-label="Status"
            className='w-full text-sm rounded border-earth-300 dark:border-earth-600 shadow-sm focus:border-sage-500 dark:focus:border-sage-400 focus:ring-sage-500 dark:focus:ring-sage-400 p-2 border bg-white dark:bg-earth-800 text-earth-900 dark:text-earth-100'
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {(type === 'custom' || type.startsWith('custom:')) && (
        <div>
          <label htmlFor="custom-type-name" className="block text-xs font-medium text-earth-700 dark:text-earth-300 mb-1">
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
            className={`w-full text-sm rounded border-earth-300 shadow-sm focus:border-sage-500 focus:ring-sage-500 p-2 border ${
              type.startsWith('custom:') ? 'bg-earth-100 dark:bg-earth-700' : ''
            }`}
          />
          {type.startsWith('custom:') && (
            <p className="text-xs text-earth-500 dark:text-earth-400 mt-1">
              This event name is managed in Settings. To change it, go to Settings → Interview Events.
            </p>
          )}
        </div>
      )}        <div>
          <label htmlFor="event-notes" className="block text-xs font-medium text-earth-700 dark:text-earth-300 mb-1">Notes (optional)</label>
        <textarea
          id="event-notes"
          value={notes}
          onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'notes', value: e.target.value })}
          rows={2}
          aria-label="Notes"
          className='w-full text-sm rounded border-earth-300 dark:border-earth-600 shadow-sm focus:border-sage-500 dark:focus:border-sage-400 focus:ring-sage-500 dark:focus:ring-sage-400 p-2 border bg-white dark:bg-earth-800 text-earth-900 dark:text-earth-100'
        />
      </div>        <div>
          <label htmlFor="interviewer-name" className="block text-xs font-medium text-earth-700 dark:text-earth-300 mb-1">Interviewer Name (optional)</label>
        <input
          id="interviewer-name"
          type="text"
          value={interviewerName}
          onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'interviewerName', value: e.target.value })}
          placeholder="John Doe"
          aria-label="Interviewer Name"
          className='w-full text-sm rounded border-earth-300 dark:border-earth-600 shadow-sm focus:border-sage-500 dark:focus:border-sage-400 focus:ring-sage-500 dark:focus:ring-sage-400 p-2 border bg-white dark:bg-earth-800 text-earth-900 dark:text-earth-100'
        />
      </div>

      <div className="flex justify-end gap-x-2">
        <button
          type="button"
          onClick={onCancel}
          className='px-3 py-1 text-sm border border-earth-300 rounded text-earth-700 dark:text-earth-300 hover:bg-earth-50 dark:hover:bg-earth-700 transition'
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className='px-3 py-1 text-sm bg-sage-600 text-white rounded hover:bg-sage-700 transition'
        >
          Save
        </button>
      </div>
    </fieldset>
  );
};

export default TimelineEditor;

