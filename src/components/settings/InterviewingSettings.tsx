import React from 'react';
import { useTranslation } from 'react-i18next';
import { type CustomInterviewEvent } from '../../types/preferences';

interface InterviewingSettingsProps {
  customInterviewEvents: CustomInterviewEvent[];
  editingInterviewEvent: CustomInterviewEvent | null;
  interviewEventForm: Partial<CustomInterviewEvent>;
  setInterviewEventForm: (form: Partial<CustomInterviewEvent>) => void;
  onAddInterviewEvent: () => void;
  onEditInterviewEvent: (event: CustomInterviewEvent) => void;
  onUpdateInterviewEvent: () => void;
  onDeleteInterviewEvent: (eventId: string) => void;
  onCancelEdit: () => void;
}

const InterviewingSettings: React.FC<InterviewingSettingsProps> = ({
  customInterviewEvents,
  editingInterviewEvent,
  interviewEventForm,
  setInterviewEventForm,
  onAddInterviewEvent,
  onEditInterviewEvent,
  onUpdateInterviewEvent,
  onDeleteInterviewEvent,
  onCancelEdit,
}) => {
  const { t } = useTranslation();

  return (
    <div className='space-y-8'>
      {/* Form Section */}
      <div className='bg-muted/50 rounded p-6 border border-border'>
        <h3 className='text-lg font-semibold text-foreground mb-6 flex items-center gap-2'>
          <span className='p-1.5 bg-primary/5 dark:bg-primary/10 text-primary rounded'>
            <svg xmlns='http://www.w3.org/2000/svg' className='size-5' viewBox='0 0 20 20' fill='currentColor'>
              <path fillRule='evenodd' d='M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z' clipRule='evenodd' />
            </svg>
          </span>
          {editingInterviewEvent ? t('settings.interviewing.edit') : t('settings.interviewing.add')}
        </h3>

        <div className='space-y-4'>
          <div>
            <label htmlFor='interview-event-label' className='block text-sm font-bold text-muted-foreground mb-2'>
              {t('settings.interviewing.label')}
            </label>
            <input
              id='interview-event-label'
              type='text'
              value={interviewEventForm.label || ''}
              onChange={(e) => setInterviewEventForm({ ...interviewEventForm, label: e.target.value })}
              placeholder='e.g., Phone Screen, Panel Interview'
              aria-label={t('settings.interviewing.label')}
              className='w-full px-4 py-3 border border-input rounded focus:ring-2 focus:ring-ring focus:border-ring bg-background text-foreground transition-all'
            />
          </div>

          <div className='flex gap-3 pt-2'>
            {editingInterviewEvent ? (
              <>
                <button
                  type='button'
                  onClick={onUpdateInterviewEvent}
                  disabled={!interviewEventForm.label}
                  className={`px-6 py-2.5 rounded text-sm font-bold transition-all ${
                    interviewEventForm.label
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }`}
                >
                  {t('settings.interviewing.update')}
                </button>
                <button
                  type='button'
                  onClick={onCancelEdit}
                  className='px-6 py-2.5 rounded text-sm font-bold border border-border text-muted-foreground hover:bg-muted transition-all'
                >
                  {t('common.cancel')}
                </button>
              </>
            ) : (
              <button
                type='button'
                onClick={onAddInterviewEvent}
                disabled={!interviewEventForm.label}
                className={`px-6 py-2.5 rounded text-sm font-bold transition-all ${
                  interviewEventForm.label
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                }`}
              >
                {t('settings.interviewing.addEvent')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* List Section */}
      <div className='space-y-4'>
        <h3 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1'>
          {t('settings.interviewing.title')}
        </h3>

        {customInterviewEvents && customInterviewEvents.length > 0 ? (
          <div className='grid grid-cols-1 gap-3'>
            {customInterviewEvents.map((event) => (
              <div
                key={event.id}
                className='flex items-center justify-between p-4 bg-card border border-border rounded hover:border-primary/30 transition-all group'
              >
                <div className='flex items-center gap-3'>
                  <div className='size-2 rounded-full bg-primary' />
                  <span className='font-bold text-foreground'>
                    {event.label}
                  </span>
                </div>
                <div className='flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity'>
                  <button
                    type='button'
                    onClick={() => onEditInterviewEvent(event)}
                    className='p-2 text-primary hover:bg-primary/5 dark:hover:bg-primary/10 rounded transition-colors'
                    title={t('common.edit')}
                    aria-label={t('common.edit')}
                  >
                    <svg xmlns='http://www.w3.org/2000/svg' className='size-5' viewBox='0 0 20 20' fill='currentColor'>
                      <path d='M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z' />
                    </svg>
                  </button>
                  <button
                    type='button'
                    onClick={() => onDeleteInterviewEvent(event.id)}
                    className='p-2 text-destructive hover:bg-destructive/5 dark:hover:bg-destructive/10 rounded transition-colors'
                    title={t('common.delete')}
                    aria-label={t('common.delete')}
                  >
                    <svg xmlns='http://www.w3.org/2000/svg' className='size-5' viewBox='0 0 20 20' fill='currentColor'>
                      <path fillRule='evenodd' d='M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z' clipRule='evenodd' />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className='text-center py-12 bg-muted/50 rounded border-2 border-dashed border-border'>
            <p className='text-sm text-muted-foreground'>{t('settings.interviewing.noEvents')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewingSettings;