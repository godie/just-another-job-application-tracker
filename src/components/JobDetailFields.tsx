import React from 'react';
import { useTranslation } from 'react-i18next';
import { Separator } from './ui/Separator';
import { sanitizeUrl } from '../utils/url';
import { formatDate } from '../utils/timelineDisplay';
import { type JobApplication } from '../types/applications';

interface JobDetailFieldsProps {
  application: JobApplication;
}

export const DetailField = ({
  label,
  value,
}: {
  label: string;
  value: string | number | undefined | null;
}) => {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground break-words">{String(value)}</dd>
    </div>
  );
};

export const JobDetailFields: React.FC<JobDetailFieldsProps> = ({ application }) => {
  const { t } = useTranslation();
  return (
    <>
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
        <DetailField
          label={t('jobDetails.applicationDate', 'Applied')}
          value={application.applicationDate ? formatDate(application.applicationDate) : undefined}
        />
        <DetailField
          label={t('jobDetails.interviewDate', 'Interview')}
          value={application.interviewDate ? formatDate(application.interviewDate) : undefined}
        />
        <DetailField
          label={t('jobDetails.followUpDate', 'Follow-up')}
          value={application.followUpDate ? formatDate(application.followUpDate) : undefined}
        />
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
    </>
  );
};
