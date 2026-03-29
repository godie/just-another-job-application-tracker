// src/components/TimelineView.tsx
import React, { useState, useMemo, useEffect, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelection } from '../hooks/useSelection';
import { useFormatDate } from '../hooks/useFormatDate';
import type { JobApplication } from '../utils/localStorage';
import type { ApplicationWithMetadata } from '../hooks/useFilteredApplications';
import ConfirmDialog from './ConfirmDialog';
import ApplicationTimelineCard from './ApplicationTimelineCard';

interface TimelineViewProps {
  applications: ApplicationWithMetadata[];
  onEdit?: (application: JobApplication) => void;
  onDelete?: (application: JobApplication) => void;
}

const ITEMS_PER_PAGE = 10;

// Memoized to prevent re-renders when filteredApplications reference changes but content is the same
const TimelineView: React.FC<TimelineViewProps> = ({ applications, onEdit, onDelete }) => {
  const { t } = useTranslation();
  const { formatLocaleDate } = useFormatDate();
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; application: JobApplication | null }>({
    isOpen: false,
    application: null,
  });
  const expandedApps = useSelection<string>();
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
        const isExpanded = expandedApps.isSelected(app.id);
        // ⚡ Bolt: Using pre-calculated sortedTimeline and nextEvent from useFilteredApplications
        // to avoid expensive sorting and finding operations on every render cycle.
        const sortedEvents = app.sortedTimeline || [];
        const nextEvent = app.nextEvent;

        return (
          <ApplicationTimelineCard
            key={app.id}
            app={app}
            isExpanded={isExpanded}
            onToggleExpand={() => expandedApps.toggle(app.id)}
            onEdit={onEdit}
            onDelete={(application) => setDeleteConfirm({ isOpen: true, application })}
            sortedEvents={sortedEvents}
            nextEvent={nextEvent}
            getStageDisplayName={getStageDisplayName}
            getStatusColor={getStatusColor}
            formatDate={formatLocaleDate}
          />
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
