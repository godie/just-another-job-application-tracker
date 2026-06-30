import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSEO } from '../seo/useSEO';
import { useApplicationsStore } from '../stores/applicationsStore';
import { type PageType } from '../App';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Separator } from '../components/ui/Separator';
import { Card } from '../components/ui/Card';
import { getBadgeVariantForStatus } from '../utils/status';
import { sanitizeUrl } from '../utils/url';
import { formatDate, getStageDisplayName, getEventStatusColor } from '../utils/timelineDisplay';
import Footer from '../components/Footer';
import TimelineEventList from '../components/TimelineEventList';
import packageJson from '../../package.json';

interface JobDetailsPageProps {
  onNavigate?: (page: PageType) => void;
}

const DetailField = ({ label, value }: { label: string; value: string | number | undefined | null }) => {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground break-words">{String(value)}</dd>
    </div>
  );
};

const JobDetailsPage: React.FC<JobDetailsPageProps> = ({ onNavigate }) => {
  const { t } = useTranslation();
  const applications = useApplicationsStore((state) => state.applications);
  const deleteApplication = useApplicationsStore((state) => state.deleteApplication);

  const tt = t as (key: string, defaultValue?: string) => string;

  const jobId = (() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('jobId');
  })();

  const application = useMemo(() => {
    if (!jobId) return null;
    return applications.find((app) => app.id === jobId) ?? null;
  }, [applications, jobId]);

  useSEO({
    title: application
      ? `${application.position} at ${application.company} - ${t('seo.applications.title')}`
      : t('seo.applications.title'),
    description: application
      ? `${application.position} at ${application.company} - Status: ${application.status}`
      : undefined,
  });

  if (!jobId || !application) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-2xl font-serif font-semibold text-foreground mb-2">
          {t('jobDetails.notFound', 'Job Not Found')}
        </h1>
        <p className="text-muted-foreground mb-6">
          {t('jobDetails.notFoundDesc', 'The job application you are looking for does not exist or has been removed.')}
        </p>
        <Button variant="primary" onClick={() => onNavigate?.('applications')}>
          ← {t('jobDetails.backToApplications', 'Back to Applications')}
        </Button>
      </div>
    );
  }

  const sortedEvents = (application.timeline || []).toSorted(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const handleDelete = () => {
    deleteApplication(application.id);
    onNavigate?.('applications');
  };

  const handleEdit = () => {
    window.dispatchEvent(new CustomEvent('triggerEditJob', { detail: { jobId: application.id } }));
    onNavigate?.('applications');
  };


  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-8">
      {/* Back Navigation */}
      <Button
        variant="ghost"
        size="md"
        onClick={() => onNavigate?.('applications')}
        className="mb-6 gap-1.5"
      >
        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {t('jobDetails.backToApplications', 'Back to Applications')}
      </Button>

      {/* Header */}
      <Card className="mb-6 overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 font-mono">
                <span className="bg-muted px-2 py-0.5 rounded">{application.id}</span>
              </div>
              <h1 className="text-2xl font-serif font-bold text-foreground truncate">
                {application.position}
              </h1>
              <p className="text-lg text-muted-foreground mt-1">{application.company}</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <Badge variant={getBadgeVariantForStatus(application.status)}>
                {application.status}
              </Badge>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={handleEdit}>
              {t('common.edit')}
            </Button>
            <Button variant="danger" size="sm" onClick={handleDelete}>
              {t('common.delete')}
            </Button>
          </div>
        </div>
      </Card>

      {/* Key Details Grid */}
      <Card className="mb-6">
        <div className="p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
            {t('jobDetails.details', 'Job Details')}
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
            <DetailField label={t('jobDetails.position', 'Position')} value={application.position} />
            <DetailField label={t('jobDetails.company', 'Company')} value={application.company} />
            <DetailField label={t('jobDetails.location', 'Location')} value={application.location} />
            <DetailField label={t('jobDetails.workType', 'Work Type')} value={application.workType} />
            {application.hybridDaysInOffice && (
              <DetailField label={t('jobDetails.hybridDays', 'Days in Office')} value={application.hybridDaysInOffice} />
            )}
            <DetailField label={t('jobDetails.salary', 'Salary')} value={application.salary} />
            <DetailField label={t('jobDetails.platform', 'Platform')} value={application.platform} />
            <DetailField label={t('jobDetails.contactName', 'Contact')} value={application.contactName} />
            <DetailField label={t('jobDetails.applicationDate', 'Applied')} value={application.applicationDate ? formatDate(application.applicationDate) : undefined} />
            <DetailField label={t('jobDetails.interviewDate', 'Interview')} value={application.interviewDate ? formatDate(application.interviewDate) : undefined} />
            <DetailField label={t('jobDetails.followUpDate', 'Follow-up')} value={application.followUpDate ? formatDate(application.followUpDate) : undefined} />
          </dl>

          {application.link && (
            <>
              <Separator className="my-4" />
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('jobDetails.jobLink', 'Job Link')}:
                </span>
                <a
                  href={sanitizeUrl(application.link)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline break-all"
                >
                  {application.link}
                </a>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Notes */}
      {application.notes && (
        <Card className="mb-6">
          <div className="p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              {t('jobDetails.notes', 'Notes')}
            </h2>
            <p className="text-sm text-foreground whitespace-pre-line break-words">
              {application.notes}
            </p>
          </div>
        </Card>
      )}

      {/* Timeline Events */}
      {sortedEvents.length > 0 && (
        <Card className="mb-6">
          <div className="p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
              {t('jobDetails.timeline', 'Timeline')} ({sortedEvents.length})
            </h2>
            <TimelineEventList
              events={sortedEvents}
              getStageDisplayName={(type, customTypeName) => getStageDisplayName(tt, type, customTypeName)}
              getStatusColor={getEventStatusColor}
              formatDate={formatDate}
            />
          </div>
        </Card>
      )}

      {/* Custom Fields */}
      {application.customFields && Object.keys(application.customFields).length > 0 && (
        <Card className="mb-6">
          <div className="p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
              {t('jobDetails.customFields', 'Custom Fields')}
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              {Object.entries(application.customFields).map(([key, value]) => (
                <DetailField key={key} label={key} value={value} />
              ))}
            </dl>
          </div>
        </Card>
      )}

      {/* Bottom Actions */}
      <div className="flex items-center justify-between mb-8">
        <Button variant="ghost" onClick={() => onNavigate?.('applications')}>
          ← {t('jobDetails.backToApplications', 'Back to Applications')}
        </Button>
        <Button variant="outline" onClick={handleEdit}>
          {t('common.edit')}
        </Button>
      </div>

      <Footer version={packageJson.version} />
    </div>
  );
};

export default JobDetailsPage;
