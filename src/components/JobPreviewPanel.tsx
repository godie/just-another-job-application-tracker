import React, { useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useApplicationsStore } from '../stores/applicationsStore';
import { type PageType } from '../App';
import { type JobApplication } from '../types/applications';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Separator } from './ui/Separator';
import { getBadgeVariantForStatus } from '../utils/status';
import { sanitizeUrl } from '../utils/url';
import { formatDate } from '../utils/timelineDisplay';
import useFocusTrap from '../hooks/useFocusTrap';

interface JobPreviewPanelProps {
  jobId: string;
  onClose: () => void;
  onNavigate?: (page: PageType) => void;
  onEdit?: (application: JobApplication) => void;
  onDelete?: (application: JobApplication) => void;
}

const NOTES_EXCERPT_MAX_LENGTH = 150;

// --- Sub-components (kept co-located: strictly private to the panel) ---

const PreviewHeader: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-primary/10 flex-shrink-0">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {t('jobPreview.preview', 'Job Preview')}
      </h2>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="p-1.5 text-muted-foreground hover:text-foreground"
        aria-label={t('common.close', 'Close')}
        data-testid="preview-close"
      >
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </Button>
    </div>
  );
};

const PreviewKeyInfoGrid: React.FC<{ application: JobApplication }> = ({ application }) => {
  const { t } = useTranslation();
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
      {application.location && (
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
            {t('jobPreview.location', 'Location')}
          </dt>
          <dd className="text-sm text-foreground mt-0.5">{application.location}</dd>
        </div>
      )}
      {application.workType && (
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
            {t('jobPreview.workType', 'Work Type')}
          </dt>
          <dd className="text-sm text-foreground mt-0.5 capitalize">{application.workType}</dd>
        </div>
      )}
      {application.salary && (
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
            {t('jobPreview.salary', 'Salary')}
          </dt>
          <dd className="text-sm text-foreground mt-0.5">{application.salary}</dd>
        </div>
      )}
      {application.platform && (
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
            {t('jobPreview.platform', 'Platform')}
          </dt>
          <dd className="text-sm text-foreground mt-0.5">{application.platform}</dd>
        </div>
      )}
    </dl>
  );
};

const PreviewDates: React.FC<{ application: JobApplication }> = ({ application }) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
        {t('jobPreview.dates', 'Dates')}
      </h4>
      <div className="bg-muted rounded p-3 space-y-1.5 text-sm">
        {application.applicationDate && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('jobPreview.applied', 'Applied')}</span>
            <span className="font-medium text-foreground">{formatDate(application.applicationDate)}</span>
          </div>
        )}
        {application.interviewDate && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('jobPreview.interview', 'Interview')}</span>
            <span className="font-medium text-foreground">{formatDate(application.interviewDate)}</span>
          </div>
        )}
        {application.followUpDate && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('jobPreview.followUp', 'Follow-up')}</span>
            <span className="font-medium text-foreground">{formatDate(application.followUpDate)}</span>
          </div>
        )}
        {!application.applicationDate && !application.interviewDate && !application.followUpDate && (
          <p className="text-muted-foreground/70 italic text-sm">
            {t('jobPreview.noDates', 'No dates recorded')}
          </p>
        )}
      </div>
    </div>
  );
};

const PreviewBody: React.FC<{
  application: JobApplication;
  onOpenFullDetails: () => void;
}> = ({ application, onOpenFullDetails }) => {
  const { t } = useTranslation();

  const notesExcerpt = application.notes
    ? application.notes.length > NOTES_EXCERPT_MAX_LENGTH
      ? application.notes.substring(0, NOTES_EXCERPT_MAX_LENGTH) + '...'
      : application.notes
    : null;

  const timelineCount = application.timeline?.length ?? 0;
  const customFieldsCount = application.customFields ? Object.keys(application.customFields).length : 0;

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
      {/* Job ID — clickable link to full details */}
      <button
        type="button"
        onClick={onOpenFullDetails}
        className="group inline-flex items-center gap-1.5 text-xs font-mono text-primary hover:text-primary/80 hover:underline transition-colors"
        aria-label={t('jobPreview.openFullDetails', 'Open full job details')}
        data-testid="preview-job-id"
      >
        <span className="bg-secondary px-2 py-0.5 rounded group-hover:bg-primary/10 transition-colors">
          {application.id}
        </span>
        <svg className="size-3.5 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </button>

      {/* Title & Company */}
      <div>
        <h3 className="text-xl font-bold text-foreground leading-tight break-words">
          {application.position}
        </h3>
        <p className="text-base text-muted-foreground mt-1">{application.company}</p>
      </div>

      {/* Status Badge */}
      <div>
        <Badge variant={getBadgeVariantForStatus(application.status)}>
          {application.status}
        </Badge>
      </div>

      <Separator />

      <PreviewKeyInfoGrid application={application} />

      <PreviewDates application={application} />

      {/* Contact */}
      {application.contactName && (
        <div>
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70 mb-1">
            {t('jobPreview.contact', 'Contact')}
          </h4>
          <p className="text-sm text-foreground">{application.contactName}</p>
        </div>
      )}

      {/* Link */}
      {application.link && (
        <div>
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70 mb-1">
            {t('jobPreview.jobLink', 'Job Link')}
          </h4>
          <a
            href={sanitizeUrl(application.link)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline break-all"
          >
            {application.link}
          </a>
        </div>
      )}

      {/* Notes Excerpt */}
      {notesExcerpt && (
        <div>
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70 mb-1">
            {t('jobPreview.notes', 'Notes')}
          </h4>
          <p className="text-sm text-muted-foreground whitespace-pre-line break-words">
            {notesExcerpt}
          </p>
        </div>
      )}

      {/* Meta counts */}
      {(timelineCount > 0 || customFieldsCount > 0) && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {timelineCount > 0 && (
            <span>
              {t('jobPreview.timelineEvents', '{{count}} timeline event(s)', { count: timelineCount })}
            </span>
          )}
          {customFieldsCount > 0 && (
            <span>
              {t('jobPreview.customFieldsCount', '{{count}} custom field(s)', { count: customFieldsCount })}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

const PreviewFooter: React.FC<{
  onEdit: () => void;
  onDelete: () => void;
}> = ({ onEdit, onDelete }) => {
  const { t } = useTranslation();
  return (
    <div className="px-6 py-4 border-t border-border bg-muted flex items-center gap-3 flex-shrink-0">
      <Button
        variant="outline"
        size="sm"
        onClick={onEdit}
        className="flex-1"
        data-testid="preview-edit"
      >
        {t('common.edit', 'Edit')}
      </Button>
      <Button
        variant="danger"
        size="sm"
        onClick={onDelete}
        className="flex-1"
        data-testid="preview-delete"
      >
        {t('common.delete', 'Delete')}
      </Button>
    </div>
  );
};

const PreviewEmptyState: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useTranslation();
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Empty Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[480px] bg-card shadow-2xl z-50 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div>
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-muted-foreground text-sm">
              {t('jobPreview.notFound', 'Application not found.')}
            </p>
          </div>
        </div>
        <div className="p-4 border-t border-border">
          <Button variant="ghost" onClick={onClose} className="w-full">
            {t('common.close', 'Close')}
          </Button>
        </div>
      </div>
    </>
  );
};

const JobPreviewPanel: React.FC<JobPreviewPanelProps> = ({
  jobId,
  onClose,
  onNavigate,
  onEdit,
  onDelete,
}) => {
  const { t } = useTranslation();
  const applications = useApplicationsStore((state) => state.applications);
  const panelRef = useRef<HTMLElement>(null);

  useFocusTrap(panelRef);

  const application = applications.find((app) => app.id === jobId);

  const handleOpenFullDetails = useCallback(() => {
    if (!application) return;
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('page', 'job-details');
      url.searchParams.set('jobId', application.id);
      window.history.pushState({ page: 'job-details' }, '', url.toString());
    }
    onNavigate?.('job-details');
  }, [application, onNavigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  if (!application) {
    return <PreviewEmptyState onClose={onClose} />;
  }

  const handleEdit = () => {
    onEdit?.(application);
  };

  const handleDelete = () => {
    onDelete?.(application);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
        data-testid="preview-backdrop"
      />

      {/* Panel */}
      <aside
        ref={panelRef}
        className="fixed right-0 top-0 bottom-0 w-full sm:w-[480px] bg-card shadow-2xl z-50 flex flex-col animate-slide-in-right"
        aria-label={t('jobPreview.panelTitle', 'Job Preview')}
        data-testid="preview-panel"
      >
        <PreviewHeader onClose={onClose} />
        <PreviewBody application={application} onOpenFullDetails={handleOpenFullDetails} />
        <PreviewFooter onEdit={handleEdit} onDelete={handleDelete} />
      </aside>
    </>
  );
};

export default JobPreviewPanel;
