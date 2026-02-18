import React, { useMemo, useState, memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { JobApplication } from '../utils/localStorage';
import type { ApplicationWithMetadata } from '../hooks/useFilteredApplications';
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
    // For "Interviewing" sub-statuses, we want to keep them together after the main "Interviewing" status
    const orderedStatuses: string[] = [];
    const interviewingSubStatuses: string[] = [];
    const otherStatuses: string[] = [];

    // First, add default statuses in order (but skip "Interviewing" for now)
    DEFAULT_STATUS_ORDER.forEach((status) => {
      if (status === 'Interviewing') {
        // Collect all "Interviewing - *" sub-statuses
        statuses.forEach((s) => {
          if (s.startsWith('Interviewing - ')) {
            interviewingSubStatuses.push(s);
          }
        });
        // Sort sub-statuses alphabetically
        interviewingSubStatuses.sort();
        // Add main "Interviewing" if it exists (without sub-status)
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
      <div className="bg-white rounded-xl shadow-md border border-dashed border-gray-300 p-8 text-center text-gray-500">
        <p className="font-medium">{t('kanban.noApplications')}</p>
        <p className="text-sm mt-2">{t('kanban.startAdding')}</p>
      </div>
    );
  }

  return (
    <div className="flex overflow-x-auto space-x-4">
      {grouped.map(({ status, items }) => {
        let displayStatus = status;
        if (status.startsWith('Interviewing - ')) {
          const subStatus = status.replace('Interviewing - ', '');
          displayStatus = `${t('statuses.interviewing')} - ${subStatus}`;
        } else {
          displayStatus = t(`statuses.${status.toLowerCase()}`, status);
        }

        return (
        <section key={status} className="bg-gray-50 border border-gray-200 rounded-xl shadow-sm flex flex-col w-80 flex-shrink-0">
          <header className="px-4 py-3 border-b border-gray-200 bg-white rounded-t-xl">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600 flex items-center justify-between">
              <span>{displayStatus}</span>
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-100 rounded-full px-2 py-0.5">{items.length}</span>
            </h3>
          </header>
          <div className="flex-1 px-4 py-3 space-y-3">
            {items.length === 0 ? (
              <p className="text-sm text-gray-400 italic">{t('kanban.noAppsInStage')}</p>
            ) : (
              items.map((application) => (
                <article
                  key={application.id}
                  className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition cursor-pointer"
                  onClick={() => onEdit?.(application)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onEdit?.(application);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={t('kanban.editApp', { position: application.position, company: application.company })}
                >
                  <div className="p-4 space-y-2">
                    <div>
                      <h4 className="text-base font-semibold text-gray-900">{application.position}</h4>
                      <p className="text-sm text-gray-600">{application.company}</p>
                    </div>
                    <div className="flex items-center text-xs text-gray-500 flex-wrap gap-1">
                      {application.translatedPlatform && (
                        <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{application.translatedPlatform}</span>
                      )}
                      {application.applicationDate && (
                        <span className="text-gray-500">{t('kanban.applied', { date: application.applicationDate })}</span>
                      )}
                    </div>
                    {application.timeline && application.timeline.length > 0 && (
                      <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-2">
                        <p className="text-xs text-indigo-700 font-semibold">{t('kanban.timeline')}</p>
                        <ul className="mt-1 space-y-1 text-xs text-indigo-600">
                          {application.timeline.slice(0, 2).map((event) => (
                            <li key={event.id} className="flex items-center gap-1">
                              <span className="w-2 h-2 bg-indigo-400 rounded-full"></span>
                              <span className="font-medium">
                                {event.type === 'custom' && event.customTypeName
                                  ? event.customTypeName
                                  : t(`insights.interviewTypes.${event.type}`, event.type.replace(/_/g, ' '))}
                              </span>
                              {event.date && <span className="text-gray-500">· {event.date}</span>}
                            </li>
                          ))}
                          {application.timeline.length > 2 && (
                            <li className="text-xs text-gray-500">{t('kanban.more', { count: application.timeline.length - 2 })}</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                  <footer className="px-4 py-2 border-t border-gray-200 bg-gray-50 rounded-b-lg flex justify-end">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm({ isOpen: true, application });
                      }}
                      className="text-xs font-semibold text-red-600 hover:text-red-800"
                    >
                      {t('common.delete')}
                    </button>
                  </footer>
                </article>
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

KanbanView.displayName = 'KanbanView';

export default memo(KanbanView);
