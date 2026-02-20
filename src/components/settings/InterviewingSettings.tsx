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
    <div>
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{t('settings.interviewing.title')}</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        {t('settings.interviewing.desc')}
      </p>

      {/* Add/Edit Interview Event Form */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
          {editingInterviewEvent ? t('settings.interviewing.edit') : t('settings.interviewing.add')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="interview-event-label" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('settings.interviewing.label')}
            </label>
            <input
              id="interview-event-label"
              type="text"
              value={interviewEventForm.label || ''}
              onChange={(e) => setInterviewEventForm({ ...interviewEventForm, label: e.target.value })}
              placeholder="e.g., Phone Screen, Panel Interview"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          {editingInterviewEvent ? (
            <>
              <button
                type="button"
                onClick={onUpdateInterviewEvent}
                disabled={!interviewEventForm.label}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
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
                className="px-4 py-2 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {t('common.cancel')}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onAddInterviewEvent}
              disabled={!interviewEventForm.label}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
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

      {/* Interview Events List */}
      {customInterviewEvents && customInterviewEvents.length > 0 ? (
        <div className="border border-gray-100 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
          {customInterviewEvents.map((event) => (
            <div
              key={event.id}
              className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <div>
                <div className="font-medium text-gray-800 dark:text-white">
                  {event.label}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onEditInterviewEvent(event)}
                  className="px-3 py-1 text-xs font-medium text-indigo-600 border border-indigo-300 dark:border-indigo-700 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/50"
                >
                  {t('common.edit')}
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteInterviewEvent(event.id)}
                  className="px-3 py-1 text-xs font-medium text-red-600 border border-red-300 dark:border-red-700 rounded hover:bg-red-50 dark:hover:bg-red-900/50"
                >
                  {t('common.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p className="text-sm">{t('settings.interviewing.noEvents')}</p>
        </div>
      )}
    </div>
  );
};

export default InterviewingSettings;
