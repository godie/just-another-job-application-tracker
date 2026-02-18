import React from 'react';
import { useTranslation } from 'react-i18next';
import { type InterviewEvent } from '../utils/localStorage';

interface TimelineEventListProps {
  events: InterviewEvent[];
  getStageDisplayName: (type: string, customTypeName?: string) => string;
  getStatusColor: (status: string) => string;
  formatDate: (dateString: string) => string;
}

const TimelineEventList: React.FC<TimelineEventListProps> = ({
  events,
  getStageDisplayName,
  getStatusColor,
  formatDate,
}) => {
  const { t } = useTranslation();

  if (events.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400 italic">{t('timeline.noEvents')}</p>;
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-600 sm:left-5"></div>

      {/* Timeline events */}
      <div className="space-y-6 pl-10 sm:pl-12">
        {events.map((event) => (
          <div key={event.id} className="relative flex items-start">
            {/* Timeline dot */}
            <div className="absolute left-[-34px] sm:left-[-37px] top-1">
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full ${getStatusColor(event.status)} border-4 border-white dark:border-gray-800 shadow-lg flex items-center justify-center`}>
                {event.status === 'completed' && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                {event.status === 'scheduled' && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                )}
                {event.status === 'cancelled' && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                )}
                {event.status === 'pending' && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </div>

            {/* Event content */}
            <div className="ml-0 flex-1">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                      {getStageDisplayName(event.type, event.customTypeName)}
                    </h4>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">{formatDate(event.date)}</p>
                    {event.interviewerName && (
                      <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">
                        👤 {event.interviewerName}
                      </p>
                    )}
                    {event.notes && (
                      <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 italic">"{event.notes}"</p>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold capitalize ${
                    event.status === 'completed' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                    event.status === 'scheduled' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' :
                    event.status === 'cancelled' ? 'bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200' :
                    'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                  }`}>
                    {t(`common.status_types.${event.status}`)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TimelineEventList;
