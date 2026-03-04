import React from 'react';
import { useTranslation } from 'react-i18next';
import { type CustomInterviewEvent } from '../../utils/localStorage';

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
    <div className="space-y-8">
      {/* Form Section */}
      <div className="bg-gray-50 dark:bg-gray-700/30 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <span className="p-1.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 rounded-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </span>
          {editingInterviewEvent ? t('settings.interviewing.edit') : t('settings.interviewing.add')}
        </h3>

        <div className="space-y-4">
          <div>
            <label htmlFor="interview-event-label" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              {t('settings.interviewing.label')}
            </label>
            <input
              id="interview-event-label"
              type="text"
              value={interviewEventForm.label || ''}
              onChange={(e) => setInterviewEventForm({ ...interviewEventForm, label: e.target.value })}
              placeholder="e.g., Phone Screen, Panel Interview"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm transition-all"
            />
          </div>

          <div className="flex gap-3 pt-2">
            {editingInterviewEvent ? (
              <>
                <button
                  type="button"
                  onClick={onUpdateInterviewEvent}
                  disabled={!interviewEventForm.label}
                  className={`px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all ${
                    interviewEventForm.label
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-gray-200 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {t('settings.interviewing.update')}
                </button>
                <button
                  type="button"
                  onClick={onCancelEdit}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                >
                  {t('common.cancel')}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onAddInterviewEvent}
                disabled={!interviewEventForm.label}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all ${
                  interviewEventForm.label
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-gray-200 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
              >
                {t('settings.interviewing.addEvent')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* List Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">
          {t('settings.interviewing.title')}
        </h3>

        {customInterviewEvents && customInterviewEvents.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {customInterviewEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span className="font-bold text-gray-900 dark:text-white">
                    {event.label}
                  </span>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => onEditInterviewEvent(event)}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                    title={t('common.edit')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteInterviewEvent(event.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    title={t('common.delete')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.interviewing.noEvents')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewingSettings;
