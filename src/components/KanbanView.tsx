import React, { useMemo, useState, memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { JobApplication } from '../types/applications';
import type { ApplicationWithMetadata } from '../types/applications';
import ConfirmDialog from './ConfirmDialog';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

interface KanbanViewProps {
  applications: ApplicationWithMetadata[];
  onSelectJob?: (application: JobApplication) => void;
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

const KanbanView: React.FC<KanbanViewProps> = ({ applications, onSelectJob, onEdit, onDelete }) => {
  const { t } = useTranslation();
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; application: JobApplication | null }>({
    isOpen: false,
    application: null,
  });

  const handleMoveApplication = (application: JobApplication, newStatus: string) => {
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

      if (app.status === 'Interviewing' && app.interviewingSubStatus) {
        statusKey = `Interviewing - ${app.interviewingSubStatus}`;
      }

      statuses.add(statusKey);
      if (!byStatus.has(statusKey)) {
        byStatus.set(statusKey, []);
      }
      byStatus.get(statusKey)!.push(app);
    });

    const orderedStatuses: string[] = [];
    const interviewingSubStatuses: string[] = [];
    const otherStatuses: string[] = [];

    DEFAULT_STATUS_ORDER.forEach((status) => {
      if (status === 'Interviewing') {
        statuses.forEach((s) => {
          if (s.startsWith('Interviewing - ')) {
            interviewingSubStatuses.push(s);
          }
        });
        interviewingSubStatuses.sort();
        if (statuses.has('Interviewing')) {
          orderedStatuses.push('Interviewing');
        }
        orderedStatuses.push(...interviewingSubStatuses);
      } else if (statuses.has(status)) {
        orderedStatuses.push(status);
      }
    });

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
      <div className='bg-card rounded border border-dashed border-border p-8 text-center text-muted-foreground'>
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
          className='bg-muted border border-border rounded flex flex-col w-80 flex-shrink-0'
          aria-label={`${displayStatus} column`}
        >
          <header className='px-4 py-3 border-b border-border bg-card rounded-t'>
            <h3 className='text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center justify-between'>
              <span>{displayStatus}</span>
              <Badge variant='secondary' aria-label={`${items.length} items`}>{items.length}</Badge>
            </h3>
          </header>
          <div className='flex-1 px-4 py-3 space-y-3'>
            {items.length === 0 ? (
              <p className='text-sm text-muted-foreground italic'>{t('kanban.noAppsInStage')}</p>
            ) : (
              items.map((application) => (
                <div
                  key={application.id}
                  className='bg-card rounded border border-border hover:border-primary/50 transition'
                >
                  <button
                    type="button"
                    className='w-full rounded-t cursor-pointer text-left p-4 space-y-2'
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectJob?.(application);
                    }}
                    aria-label={t('kanban.editApp', { position: application.position, company: application.company })}
                  >
                    <div>
                      <h4 className='text-base font-semibold text-foreground'>{application.position}</h4>
                      <p className='text-sm text-muted-foreground'>{application.company}</p>
                    </div>
                    <div className='flex items-center text-xs text-muted-foreground flex-wrap gap-1'>
                      {application.translatedPlatform && (
                        <Badge variant='outline' className='text-xs'>{application.translatedPlatform}</Badge>
                      )}
                      {application.applicationDate && (
                        <span>{t('kanban.applied', { date: application.applicationDate })}</span>
                      )}
                    </div>
                    {application.sortedTimeline && application.sortedTimeline.length > 0 && (
                      <div className='bg-primary/10 border border-primary/20 rounded p-2'>
                        <p className='text-xs text-primary font-semibold'>{t('kanban.timeline')}</p>
                        <ul className='mt-1 space-y-1 text-xs text-primary/80'>
                          {/* ⚡ Bolt: Using pre-calculated sortedTimeline to ensure chronological order
                              and better performance in the Kanban view. */}
                          {application.sortedTimeline.slice(0, 2).map((event) => (
                            <li key={event.id} className='flex items-center gap-1'>
                              <span className='size-2 bg-primary/60 rounded-full'></span>
                              <span className='font-medium'>
                                {event.type === 'custom' && event.customTypeName
                                  ? event.customTypeName
                                  : t(`insights.interviewTypes.${event.type}`, event.type.replace(/_/g, ' '))}
                              </span>
                              {event.date && <span className='text-muted-foreground'>· {event.date}</span>}
                            </li>
                          ))}
                          {application.timeline.length > 2 && (
                            <li className='text-xs text-muted-foreground'>{t('kanban.more', { count: application.timeline.length - 2 })}</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </button>
                  <footer className='px-4 py-2 border-t border-border bg-muted rounded-b flex flex-col gap-2'>
                    {/* Keyboard accessible status change buttons */}
                    <menu className='flex flex-wrap gap-1' aria-label={t('kanban.moveToStatus')}>
                      {statusOptions.slice(0, 3).map((targetStatus) => (
                        <Button
                          key={targetStatus}
                          type='button'
                          variant='secondary'
                          size='sm'
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveApplication(application, targetStatus);
                          }}
                          aria-label={t('kanban.moveTo', { status: targetStatus })}
                        >
                          → {targetStatus}
                        </Button>
                      ))}
                    </menu>
                    <div className='flex justify-end'>
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm({ isOpen: true, application });
                        }}
                        className='text-destructive hover:text-destructive/80'
                        aria-label={t('kanban.deleteApp', { position: application.position, company: application.company })}
                      >
                        {t('common.delete')}
                      </Button>
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