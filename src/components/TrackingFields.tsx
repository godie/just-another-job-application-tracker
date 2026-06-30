import React from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import type { JobApplication } from '../types/applications';

interface TrackingFieldsProps {
  formData: Omit<JobApplication, 'id'> | JobApplication;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}

export const TrackingFields: React.FC<TrackingFieldsProps> = ({ formData, onChange }) => {
  const { t } = useTranslation();

  return (
    <>
      <div className="col-span-full border-b border-border pb-3 mb-6 mt-4">
        <p className="text-base font-semibold text-muted-foreground">{t('form.trackingTimeline')}</p>
      </div>

      <Input
        label={t('form.applicationDate')}
        type="date"
        data-testid="form-application-date"
        name="applicationDate"
        value={formData.applicationDate}
        onChange={onChange}
        required
      />

      <Select
        label={t('form.status')}
        name="status"
        value={formData.status || 'Applied'}
        data-testid="form-status"
        onChange={onChange}
        required
      >
        {['Applied', 'Interviewing', 'Offer', 'Rejected', 'Hold'].map((s) => (
          <option key={s} value={s}>{t(`statuses.${s.toLowerCase()}`)}</option>
        ))}
      </Select>

      <Input
        label={t('form.salary')}
        type="text"
        name="salary"
        value={formData.salary}
        onChange={onChange}
        maxLength={100}
      />

      <Input
        label={t('form.interviewDate')}
        type="date"
        name="interviewDate"
        value={formData.interviewDate}
        onChange={onChange}
      />

      <Input
        label={t('form.followUpDate')}
        type="date"
        name="followUpDate"
        value={formData.followUpDate}
        onChange={onChange}
      />

      <Input
        label={t('form.link')}
        type="url"
        name="link"
        value={formData.link}
        onChange={onChange}
        maxLength={500}
      />
    </>
  );
};
