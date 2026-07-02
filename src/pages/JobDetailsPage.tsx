import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSEO } from '../seo/useSEO';
import { useApplicationsStore } from '../stores/applicationsStore';
import { type PageType } from '../App';
import { type JobApplication } from '../types/applications';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { JobHeaderCard } from '../components/JobHeaderCard';
import { JobEditForm } from '../components/JobEditForm';
import { JobDetailFields, DetailField } from '../components/JobDetailFields';
import { JobDetailFooter } from '../components/JobDetailFooter';
import { useAlert } from '../components/AlertProvider';
import { toWorkType } from '../utils/applications';
import { formatDate, getStageDisplayName, getEventStatusColor } from '../utils/timelineDisplay';
import Footer from '../components/Footer';
import TimelineEventList from '../components/TimelineEventList';
import packageJson from '../../package.json';

interface JobDetailsPageProps {
  onNavigate?: (page: PageType) => void;
}

const JobDetailsPage: React.FC<JobDetailsPageProps> = ({ onNavigate }) => {
  const { t } = useTranslation();
  const applications = useApplicationsStore((state) => state.applications);
  const deleteApplication = useApplicationsStore((state) => state.deleteApplication);
  const updateApplication = useApplicationsStore((state) => state.updateApplication);
  const { showSuccess } = useAlert();

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

  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<JobApplication | null>(null);

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

  const handleBack = () => onNavigate?.('applications');

  const handleDelete = () => {
    deleteApplication(application.id);
    handleBack();
  };

  const handleEdit = () => {
    if (application.status === 'Deleted') return;
    setEditFormData({ ...application });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditFormData(null);
    setIsEditing(false);
  };

  // Mirror AddJobForm's pre-save normalization; timeline intentionally NOT re-built
  // when empty (inline edit preserves user intent; cleared timeline stays cleared),
  // unlike AddJobForm which auto-seeds new applications via buildInitialTimeline().
  const handleSaveEdit = () => {
    if (!editFormData) return;
    const validWorkType = toWorkType(editFormData.workType);
    const hybridDaysInOffice =
      validWorkType === 'hybrid' && typeof editFormData.hybridDaysInOffice === 'number'
        ? editFormData.hybridDaysInOffice
        : undefined;
    const normalized = {
      ...editFormData,
      status: editFormData.status || 'Applied',
      location: editFormData.location || undefined,
      workType: validWorkType,
      hybridDaysInOffice,
    };
    updateApplication(application.id, normalized);
    showSuccess(t('jobDetails.saved', 'Changes saved'));
    setEditFormData(null);
    setIsEditing(false);
  };

  const updateEditFormField = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setEditFormData((prev) => {
      if (!prev) return prev;
      if (name === 'hybridDaysInOffice') {
        const num = value === '' ? undefined : parseInt(value, 10);
        return { ...prev, hybridDaysInOffice: num };
      }
      return { ...prev, [name]: value } as JobApplication;
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-8">
      {/* Top Back Navigation */}
      <Button
        variant="ghost"
        size="md"
        onClick={handleBack}
        className="mb-6 gap-1.5"
      >
        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {t('jobDetails.backToApplications', 'Back to Applications')}
      </Button>

      <JobHeaderCard
        application={application}
        isEditing={isEditing}
        onDoubleClick={isEditing ? undefined : handleEdit}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCancelEdit={handleCancelEdit}
        onSaveEdit={handleSaveEdit}
      />

      {/* Key Details Grid / Edit Form */}
      <Card className="mb-6">
        <div className="p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
            {isEditing
              ? t('jobDetails.editDetails', 'Edit Job Details')
              : t('jobDetails.details', 'Job Details')}
          </h2>
          {isEditing && editFormData ? (
            <JobEditForm
              formData={editFormData}
              onChange={updateEditFormField}
              onSubmit={handleSaveEdit}
            />
          ) : (
            <JobDetailFields application={application} />
          )}
        </div>
      </Card>

      {/* Notes (view-only — edit mode captures notes inside the form above) */}
      {!isEditing && application.notes && (
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

      {/* Timeline Events (view-only) */}
      {!isEditing && sortedEvents.length > 0 && (
        <Card className="mb-6">
          <div className="p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
              {t('jobDetails.timeline', 'Timeline')} ({sortedEvents.length})
            </h2>
            <TimelineEventList
              events={sortedEvents}
              getStageDisplayName={(type, customTypeName) =>
                getStageDisplayName(tt, type, customTypeName)
              }
              getStatusColor={getEventStatusColor}
              formatDate={formatDate}
            />
          </div>
        </Card>
      )}

      {/* Custom Fields (view-only) */}
      {!isEditing && application.customFields && Object.keys(application.customFields).length > 0 && (
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

      <JobDetailFooter
        isEditing={isEditing}
        onBack={handleBack}
        onEdit={handleEdit}
        onCancelEdit={handleCancelEdit}
        onSaveEdit={handleSaveEdit}
      />

      <Footer version={packageJson.version} />
    </div>
  );
};

export default JobDetailsPage;
