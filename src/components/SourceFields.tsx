import React from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Textarea } from './ui/Textarea';
import type { JobApplication } from '../types/applications';

interface SourceFieldsProps {
  formData: Omit<JobApplication, 'id'> | JobApplication;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}

export const SourceFields: React.FC<SourceFieldsProps> = ({ formData, onChange }) => {
  const { t } = useTranslation();

  return (
    <>
      <div className="col-span-full border-b border-border pb-3 mb-6 mt-4">
        <p className="text-base font-semibold text-muted-foreground">{t('form.sourceContact')}</p>
      </div>

      <Select
        label={t('form.platform')}
        data-testid="form-platform"
        name="platform"
        value={formData.platform}
        onChange={onChange}
      >
        {['LinkedIn', 'Indeed', 'Company Website', 'Referral', 'Other'].map((p) => (
          <option key={p} value={p}>{t(`form.platforms.${p}`)}</option>
        ))}
      </Select>

      <Input
        label={t('form.contactName')}
        type="text"
        name="contactName"
        data-testid="form-contact-name"
        value={formData.contactName}
        onChange={onChange}
        maxLength={100}
        placeholder="e.g., John Smith"
      />

      <div className="col-span-full">
        <label className="block text-xs font-semibold text-muted-foreground mb-1" htmlFor="job-form-notes">
          {t('form.notes')}
        </label>
        <Textarea
          id="job-form-notes"
          name="notes"
          value={formData.notes}
          onChange={onChange}
          rows={3}
          maxLength={2000}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {(formData.notes || '').length}/2000
        </p>
      </div>
    </>
  );
};
