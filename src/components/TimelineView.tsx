import React, { useState, useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelection } from '../hooks/useSelection';
import { useFormatDate } from '../hooks/useFormatDate';
import type { JobApplication } from '../types/applications';
import type { ApplicationWithMetadata } from '../types/applications';
import ConfirmDialog from './ConfirmDialog';
import ApplicationTimelineCard from './ApplicationTimelineCard';

interface TimelineViewProps {
  applications: ApplicationWithMetadata[];
  onSelectJob?: (application: JobApplication) => void;
  onEdit?: (application: JobApplication) => void;
  onDelete?: (application: JobApplication) => void;
}

const ITEMS_PER_PAGE = 10;

const TIMELINE_STATUS_COLORS: Record<string, string> = {
  completed: 'bg-green-500',
  scheduled: 'bg-blue-500',
  cancelled: 'bg-gray-400',
  pending: 'bg-yellow-500',
};

const getStatusColor = (status: string): string => {
  return TIMELINE_STATUS_COLORS[status] || 'bg-gray-400';
};

const TimelineView: React.FC<TimelineViewProps> = ({ applications, onSelectJob, onEdit, onDelete }) => {
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

  const totalPages = Math.max(Math.ceil(applications.length / ITEMS_PER_PAGE), 1);
  const effectivePage = useMemo(() => {
    return Math.min(currentPage, totalPages);
  }, [currentPage, totalPages]);

  const paginatedApplications = useMemo(() => {
    const startIndex = (effectivePage - 1) * ITEMS_PER_PAGE;
    return applications.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [applications, effectivePage]);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (applications.length === 0) {
    return (
      <div className='bg-card rounded border border-dashed border-border p-8 text-center text-muted-foreground'>
        <p className="font-medium">{t('timeline.noApplications')}</p>
        <p className="text-sm mt-2">{t('timeline.startAdding')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {paginatedApplications.map((app) => {
        const isExpanded = expandedApps.isSelected(app.id);
        const sortedEvents = app.sortedTimeline || [];
        const nextEvent = app.nextEvent;

        return (
          <ApplicationTimelineCard
            key={app.id}
            app={app}
            isExpanded={isExpanded}
            onToggleExpand={() => expandedApps.toggle(app.id)}
            onSelectJob={onSelectJob}
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
            type="button"
            onClick={() => goToPage(effectivePage - 1)}
            disabled={effectivePage === 1}
            className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition"
            aria-label={t('common.previous')}
          >
            {t('common.previous')}
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                type="button"
                key={page}
                onClick={() => goToPage(page)}
                className={`px-3 py-2 text-sm font-medium rounded transition ${                    effectivePage === page
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground bg-card border border-border hover:bg-accent'
                }`}
                aria-label={t('common.goToPage', { page })}
                aria-current={effectivePage === page ? 'page' : undefined}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => goToPage(effectivePage + 1)}
            disabled={effectivePage === totalPages}
            className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition"
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
