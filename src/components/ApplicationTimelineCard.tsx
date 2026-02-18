import React from 'react';
import { useTranslation } from 'react-i18next';
import { type JobApplication, type InterviewEvent } from '../utils/localStorage';
import { type ApplicationWithMetadata } from '../hooks/useFilteredApplications';
import { Badge } from './ui';
import { getBadgeVariantForStatus } from '../utils/status';
import TimelineEventList from './TimelineEventList';

interface ApplicationTimelineCardProps {
  app: ApplicationWithMetadata;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit?: (application: JobApplication) => void;
  onDelete?: (application: JobApplication) => void;
  sortedEvents: InterviewEvent[];
  nextEvent: InterviewEvent | null;
  getStageDisplayName: (type: string, customTypeName?: string) => string;
  getStatusColor: (status: string) => string;
  formatDate: (dateString: string) => string;
}

const ApplicationTimelineCard: React.FC<ApplicationTimelineCardProps> = ({
  app,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  sortedEvents,
  nextEvent,
  getStageDisplayName,
  getStatusColor,
  formatDate,
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition">
      {/* Header - Accordion Toggle */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900 dark:to-purple-900 px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <div className="space-y-1 flex-1 min-w-0">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">{app.position}</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-gray-600 dark:text-gray-300 font-medium text-sm sm:text-base truncate">{app.company}</p>
                  <Badge variant={getBadgeVariantForStatus(app.status)}>
                    {app.translatedStatus || app.status}
                  </Badge>
                </div>
              </div>
              {nextEvent && !isExpanded && (
                <div className="flex items-center gap-2 bg-white dark:bg-gray-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 flex-shrink-0">
                  <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                  <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('timeline.nextEvent', { date: formatDate(nextEvent.date) })}
                  </span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="ml-4 flex-shrink-0 p-2 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors"
            aria-label={isExpanded ? t('timeline.collapse') : t('timeline.expand')}
            aria-expanded={isExpanded}
          >
            <svg
              className={`w-5 h-5 text-gray-600 dark:text-gray-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Timeline - Collapsible Content */}
      {isExpanded && (
        <>
          <div className="px-3 sm:px-6 py-5">
            <TimelineEventList
              events={sortedEvents}
              getStageDisplayName={getStageDisplayName}
              getStatusColor={getStatusColor}
              formatDate={formatDate}
            />
          </div>

          {/* Actions */}
          <div className="px-4 sm:px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex flex-col gap-2 sm:flex-row sm:justify-end">
            {onEdit && (
              <button
                onClick={() => onEdit(app)}
                className="px-4 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900 hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded-lg transition"
              >
                {t('common.edit')}
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete?.(app)}
                className="px-4 py-2 text-sm font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 rounded-lg transition"
              >
                {t('common.delete')}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ApplicationTimelineCard;
