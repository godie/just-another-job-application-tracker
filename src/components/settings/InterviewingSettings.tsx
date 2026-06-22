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
      <div className='bg-earth-50 dark:bg-earth-800/50 rounded p-6 border border-earth-200 dark:border-earth-700'>
        <h3 className='text-lg font-semibold text-earth-900 dark:text-earth-100 mb-6 flex items-center gap-2'>
          <span className='p-1.5 bg-sage-100 dark:bg-sage-900/40 text-sage-600 dark:text-sage-400 rounded'>
            <svg xmlns='http://www.w3.org/2000/svg' className='size-5' viewBox='0 0 20 20' fill='currentColor'>
              <path fillRule='evenodd' d='M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z' clipRule='evenodd' />
            </svg>
          </span>
          {editingInterviewEvent ? t('settings.interviewing.edit') : t('settings.interviewing.add')}
        </h3>

        <div className='space-y-4'>
          <div>
            <label htmlFor='interview-event-label' className='block text-sm font-bold text-earth-700 dark:text-earth-300 mb-2'>
              {t('settings.interviewing.label')}
            </label>
            <input
              id='interview-event-label'
              type='text'
              value={interviewEventForm.label || ''}
              onChange={(e) => setInterviewEventForm({ ...interviewEventForm, label: e.target.value })}
              placeholder='e.g., Phone Screen, Panel Interview'
              aria-label={t('settings.interviewing.label')}
              className='w-full px-4 py-3 border border-earth-300 dark:border-earth-600 rounded focus:ring-2 focus:ring-sage-500 focus:border-sage-500 bg-white dark:bg-earth-800 text-earth-900 dark:text-earth-100 transition-all'
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
                      ? 'bg-sage-600 text-white hover:bg-sage-700'
                      : 'bg-earth-200 text-earth-500 dark:text-earth-400 cursor-not-allowed'
                  }`}
                >
                  {t('settings.interviewing.update')}
                </button>
                <button
                  type='button'
                  onClick={onCancelEdit}
                  className='px-6 py-2.5 rounded text-sm font-bold border border-earth-300 dark:border-earth-600 text-earth-700 dark:text-earth-300 hover:bg-earth-100 dark:hover:bg-earth-700 transition-all'
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
                    ? 'bg-sage-600 text-white hover:bg-sage-700'
                    : 'bg-earth-200 text-earth-500 dark:text-earth-400 cursor-not-allowed'
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
        <h3 className='text-sm font-semibold text-earth-500 dark:text-earth-400 uppercase tracking-wider px-1'>
          {t('settings.interviewing.title')}
        </h3>

        {customInterviewEvents && customInterviewEvents.length > 0 ? (
          <div className='grid grid-cols-1 gap-3'>
            {customInterviewEvents.map((event) => (
              <div
                key={event.id}
                className='flex items-center justify-between p-4 bg-white dark:bg-earth-800 border border-earth-200 dark:border-earth-700 rounded hover:border-sage-300 dark:hover:border-sage-600 transition-all group'
              >
                <div className='flex items-center gap-3'>
                  <div className='size-2 rounded-full bg-sage-500' />
                  <span className='font-bold text-earth-900 dark:text-earth-100'>
                    {event.label}
                  </span>
                </div>
                <div className='flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity'>
                  <button
                    type='button'
                    onClick={() => onEditInterviewEvent(event)}
                    className='p-2 text-sage-600 hover:bg-sage-50 dark:hover:bg-sage-900/30 rounded transition-colors'
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
                    className='p-2 text-terracotta-600 hover:bg-terracotta-50 dark:hover:bg-terracotta-900/30 rounded transition-colors'
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
          <div className='text-center py-12 bg-earth-50 dark:bg-earth-800/50 rounded border-2 border-dashed border-earth-200 dark:border-earth-700'>
            <p className='text-sm text-earth-500 dark:text-earth-400'>{t('settings.interviewing.noEvents')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewingSettings;