// src/components/TimelineView.tsx
import React, { useState, useMemo, useEffect, memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { JobApplication, InterviewEvent } from '../utils/localStorage';
import ConfirmDialog from './ConfirmDialog';
import { parseLocalDate } from '../utils/date';

interface TimelineViewProps {
  applications: JobApplication[];
  onEdit?: (application: JobApplication) => void;
  onDelete?: (application: JobApplication) => void;
}

const ITEMS_PER_PAGE = 10;

// Memoized to prevent re-renders when filteredApplications reference changes but content is the same
const TimelineView: React.FC<TimelineViewProps> = ({ applications, onEdit, onDelete }) => {
  const { t } = useTranslation();
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; application: JobApplication | null }>({
    isOpen: false,
    application: null,
  });
  const [expandedApps, setExpandedApps] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const getStageDisplayName = (type: string, customTypeName?: string): string => {
    if (type === 'custom' && customTypeName) {
      return customTypeName;
    }
    return t(`insights.interviewTypes.${type}`, type);
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      'completed': 'bg-green-500',
      'scheduled': 'bg-blue-500',
      'cancelled': 'bg-gray-400',
      'pending': 'bg-yellow-500',
    };
    return colors[status] || 'bg-gray-400';
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const sortEvents = (events: InterviewEvent[]): InterviewEvent[] => {
    return [...events].sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());
  };

  const getNextEvent = (events: InterviewEvent[]): InterviewEvent | null => {
    const sorted = sortEvents(events);
    const now = new Date();
    const upcoming = sorted.find((event) => parseLocalDate(event.date) >= now && event.status === 'scheduled');
    return upcoming || null;
  };

  const toggleExpanded = (appId: string) => {
    setExpandedApps((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(appId)) {
        newSet.delete(appId);
      } else {
        newSet.add(appId);
      }
      return newSet;
    });
  };

  // Pagination logic
  const totalPages = Math.ceil(applications.length / ITEMS_PER_PAGE);
  const paginatedApplications = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return applications.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [applications, currentPage]);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of timeline view
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset to page 1 if current page is beyond available pages
  useEffect(() => {
    const totalPages = Math.ceil(applications.length / ITEMS_PER_PAGE);
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [applications.length, currentPage]);

  if (applications.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-dashed border-gray-300 dark:border-gray-600 p-8 text-center text-gray-500 dark:text-gray-400">
        <p className="font-medium">{t('timeline.noApplications')}</p>
        <p className="text-sm mt-2">{t('timeline.startAdding')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {paginatedApplications.map((app) => {
        const isExpanded = expandedApps.has(app.id);
        const sortedEvents = sortEvents(app.timeline || []);
        const nextEvent = getNextEvent(app.timeline || []);
        
        return (
          <div
            key={app.id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition"
          >
            {/* Header - Accordion Toggle */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900 dark:to-purple-900 px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">{app.position}</h3>
                      <p className="text-gray-600 dark:text-gray-300 font-medium text-sm sm:text-base truncate">{app.company}</p>
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
                    toggleExpanded(app.id);
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
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-600 sm:left-5"></div>
                    
                    {/* Timeline events */}
                    <div className="space-y-6 pl-10 sm:pl-12">
                      {sortedEvents.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">{t('timeline.noEvents')}</p>
                      ) : (
                        sortedEvents.map((event) => (
                          <div key={event.id} className="relative flex items-start">
                            {/* Timeline dot */}
                            <div className="absolute left-[-34px] sm:left-[-37px] top-1">
                              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full ${getStatusColor(event.status)} border-4 border-white shadow-lg flex items-center justify-center`}>
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
                        ))
                      )}
                    </div>
                  </div>
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
                      onClick={() => {
                        setDeleteConfirm({ isOpen: true, application: app });
                      }}
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
      })}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            aria-label={t('common.previous')}
          >
            {t('common.previous')}
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => goToPage(page)}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition ${
                  currentPage === page
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                aria-label={t('common.goToPage', { page })}
                aria-current={currentPage === page ? 'page' : undefined}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            aria-label={t('common.next')}
          >
            {t('common.next')}
          </button>
        </div>
      )}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title={t('home.deleteConfirm.title')}
        message={t('home.deleteConfirm.message', {
          position: deleteConfirm.application?.position,
          company: deleteConfirm.application?.company
        })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        type="warning"
        onConfirm={() => {
          if (deleteConfirm.application && onDelete) {
            onDelete(deleteConfirm.application);
          }
          setDeleteConfirm({ isOpen: false, application: null });
        }}
        onCancel={() => setDeleteConfirm({ isOpen: false, application: null })}
      />
    </div>
  );
};

TimelineView.displayName = 'TimelineView';

export default memo(TimelineView);
