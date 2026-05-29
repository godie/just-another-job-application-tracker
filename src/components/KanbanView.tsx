import React, { useMemo, useState, memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { JobApplication } from '../types/applications';
import type { ApplicationWithMetadata } from '../types/applications';
import ConfirmDialog from './ConfirmDialog';

interface KanbanViewProps {
  applications: ApplicationWithMetadata[];
  onEdit?: (application: JobApplication) => void;
  onDelete?: (application: JobApplication) => void;
}

const DEFAULT_STATUS_ORDER = [
  'Applied',
  'Interviewing',
  'Offer',
  'Rejected',
  'Withdrawn',
  'Hold',
];

// Memoized to prevent re-renders when filteredApplications reference changes but content is the same
const KanbanView: React.FC<KanbanViewProps> = ({ applications, onEdit, onDelete }) => {
  const { t } = useTranslation();
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; application: JobApplication | null }>({
    isOpen: false,
    application: null,
  });

  // Keyboard navigation: move application to a different status
  const handleMoveApplication = (application: JobApplication, newStatus: string) => {
    // Create updated application with new status
    const updatedApp: JobApplication = {
      ...application,
      status: newStatus,
    };
    onEdit?.(updatedApp);
  };

  const grouped = useMemo(() => {
    const byStatus = new Map<string, ApplicationWithMetadata[]>();
    const statuses = new Set<string>();

    applications.forEach((app) => {
      let statusKey = app.status || 'Unknown';

      // ⚡ Bolt: Use pre-calculated interviewing sub-status.
      // This avoids redundant timeline sorting and complex logic on every render,
      // significantly improving performance when many applications are in interviewing state.
      if (app.status === 'Interviewing' && app.interviewingSubStatus) {
        statusKey = `Interviewing - ${app.interviewingSubStatus}`;
      }

      statuses.add(statusKey);
      if (!byStatus.has(statusKey)) {
        byStatus.set(statusKey, []);
      }
      byStatus.get(statusKey)!.push(app);
    });

    // Build ordered array of statuses
    // For 'Interviewing' sub-statuses, we want to keep them together after the main 'Interviewing' status
    const orderedStatuses: string[] = [];
    const interviewingSubStatuses: string[] = [];
    const otherStatuses: string[] = [];

    // First, add default statuses in order (but skip 'Interviewing' for now)
    DEFAULT_STATUS_ORDER.forEach((status) => {
      if (status === 'Interviewing') {
        // Collect all 'Interviewing - *' sub-statuses
        statuses.forEach((s) => {
          if (s.startsWith('Interviewing - ')) {
            interviewingSubStatuses.push(s);
          }
        });
        // Sort sub-statuses alphabetically
        interviewingSubStatuses.sort();
        // Add main 'Interviewing' if it exists (without sub-status)
        if (statuses.has('Interviewing')) {
          orderedStatuses.push('Interviewing');
        }
        // Add all sub-statuses
        orderedStatuses.push(...interviewingSubStatuses);
      } else if (statuses.has(status)) {
        orderedStatuses.push(status);
      }
    });

    // Add any remaining statuses that weren't in DEFAULT_STATUS_ORDER
    statuses.forEach((status) => {
      if (!orderedStatuses.includes(status) && !status.startsWith('Interviewing - ')) {
        otherStatuses.push(status);
      }
    });
    otherStatuses.sort();
    orderedStatuses.push(...otherStatuses);

    return orderedStatuses.map((status) => ({
      status,
      items: byStatus.get(status) ?? [],
    }));
  }, [applications]);

  if (applications.length === 0) {
    return (
      <div className='bg-white dark:bg-earth-800 rounded border border-dashed border-earth-300 p-8 text-center text-earth-500 dark:text-earth-400'>
        <p className='font-medium'>{t('kanban.noApplications')}</p>
        <p className='text-sm mt-2'>{t('kanban.startAdding')}</p>
      </div>
    );
  }

  return (
    <div className='flex overflow-x-auto gap-x-4'>
      {grouped.map(({ status, items }) => {
        let displayStatus = status;
        if (status.startsWith('Interviewing - ')) {
          const subStatus = status.replace('Interviewing - ', '');
          displayStatus = `${t('statuses.interviewing')} - ${subStatus}`;
        } else {
          displayStatus = t(`statuses.${status.toLowerCase()}`, status);
        }

        const statusOptions = DEFAULT_STATUS_ORDER.filter(s => s !== 'Interviewing' && s !== status);

        return (
        <section
          key={status}
          className='bg-earth-50 dark:bg-earth-800 border border-earth-200 dark:border-earth-700 rounded flex flex-col w-80 flex-shrink-0'
          aria-label={`${displayStatus} column`}
        >
          <header className='px-4 py-3 border-b border-earth-200 dark:border-earth-700 bg-white dark:bg-earth-800 rounded-t'>
            <h3 className='text-sm font-semibold uppercase tracking-wide text-earth-600 dark:text-earth-400 flex items-center justify-between'>
              <span>{displayStatus}</span>
              <span className='text-xs font-semibold text-sage-600 dark:text-sage-400 bg-sage-100 dark:bg-sage-900 rounded-full px-2 py-0.5' aria-label={`${items.length} items`}>{items.length}</span>
            </h3>
          </header>
          <div className='flex-1 px-4 py-3 space-y-3'>
            {items.length === 0 ? (
              <p className='text-sm text-earth-400 dark:text-earth-500 italic'>{t('kanban.noAppsInStage')}</p>
            ) : (
              items.map((application) => (
                <div
                  key={application.id}
                  className='bg-white dark:bg-earth-700 rounded border border-earth-200 dark:border-earth-600 hover:border-sage-400 dark:hover:border-sage-500 transition cursor-pointer'
                  onClick={() => onEdit?.(application)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onEdit?.(application);
                    }
                  }}
                  role='button'
                  tabIndex={0}
                  aria-label={t('kanban.editApp', { position: application.position, company: application.company })}
                >
                  <div className='p-4 space-y-2'>
                    <div>
                      <h4 className='text-base font-semibold text-earth-900 dark:text-earth-100'>{application.position}</h4>
                      <p className='text-sm text-earth-600 dark:text-earth-400'>{application.company}</p>
                    </div>
                    <div className='flex items-center text-xs text-earth-500 dark:text-earth-400 flex-wrap gap-1'>
                      {application.translatedPlatform && (
                        <span className='bg-earth-100 dark:bg-earth-600 text-earth-700 dark:text-earth-300 px-2 py-0.5 rounded-full'>{application.translatedPlatform}</span>
                      )}
                      {application.applicationDate && (
                        <span>{t('kanban.applied', { date: application.applicationDate })}</span>
                      )}
                    </div>
                    {application.sortedTimeline && application.sortedTimeline.length > 0 && (
                      <div className='bg-sage-50 dark:bg-sage-900/30 border border-sage-200 dark:border-sage-700 rounded p-2'>
                        <p className='text-xs text-sage-700 dark:text-sage-300 font-semibold'>{t('kanban.timeline')}</p>
                        <ul className='mt-1 space-y-1 text-xs text-sage-600 dark:text-sage-400'>
                          {/* ⚡ Bolt: Using pre-calculated sortedTimeline to ensure chronological order
                              and better performance in the Kanban view. */}
                          {application.sortedTimeline.slice(0, 2).map((event) => (
                            <li key={event.id} className='flex items-center gap-1'>
                              <span className='size-2 bg-sage-400 rounded-full'></span>
                              <span className='font-medium'>
                                {event.type === 'custom' && event.customTypeName
                                  ? event.customTypeName
                                  : t(`insights.interviewTypes.${event.type}`, event.type.replace(/_/g, ' '))}
                              </span>
                              {event.date && <span className='text-earth-400'>· {event.date}</span>}
                            </li>
                          ))}
                          {application.timeline.length > 2 && (
                            <li className='text-xs text-earth-400 dark:text-earth-500'>{t('kanban.more', { count: application.timeline.length - 2 })}</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                  <footer className='px-4 py-2 border-t border-earth-200 dark:border-earth-600 bg-earth-50 dark:bg-earth-800 rounded-b flex flex-col gap-2'>
                    {/* Keyboard accessible status change buttons */}
                    <menu className='flex flex-wrap gap-1' aria-label={t('kanban.moveToStatus')}>
                      {statusOptions.slice(0, 3).map((targetStatus) => (
                        <button
                          key={targetStatus}
                          type='button'
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveApplication(application, targetStatus);
                          }}
                          className='text-xs px-2 py-1 bg-earth-200 dark:bg-earth-600 text-earth-700 dark:text-earth-300 rounded hover:bg-earth-300 dark:hover:bg-earth-500 focus:outline-none focus:ring-2 focus:ring-sage-500'
                          aria-label={t('kanban.moveTo', { status: targetStatus })}
                        >
                          → {targetStatus}
                        </button>
                      ))}
                    </menu>
                    <div className='flex justify-end'>
                      <button
                        type='button'
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm({ isOpen: true, application });
                        }}
                        className='text-xs font-semibold text-terracotta-600 hover:text-terracotta-800 dark:text-terracotta-400 dark:hover:text-terracotta-300 focus:outline-none focus:ring-2 focus:ring-terracotta-500 rounded px-2 py-1'
                        aria-label={t('kanban.deleteApp', { position: application.position, company: application.company })}
                      >
                        {t('common.delete')}
                      </button>
                    </div>
                  </footer>
                </div>
              ))
            )}
          </div>
        </section>
        );
      })}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title={t('home.deleteConfirm.title')}
        message={t('home.deleteConfirm.message', {
          position: deleteConfirm.application?.position,
          company: deleteConfirm.application?.company
        })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        type='warning'
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

KanbanView.displayName = 'KanbanView';

export default memo(KanbanView);