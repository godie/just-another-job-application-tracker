import React from 'react';
import { useTranslation } from 'react-i18next';
import { BasicDetailsFields } from './BasicDetailsFields';
import { TrackingFields } from './TrackingFields';
import { type JobApplication } from '../types/applications';

interface JobEditFormProps {
  formData: JobApplication;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onSubmit: () => void;
}

export const JobEditForm: React.FC<JobEditFormProps> = ({ formData, onChange, onSubmit }) => {
  const { t } = useTranslation();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      data-testid="details-edit-form"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        <BasicDetailsFields formData={formData} onChange={onChange} />
        <TrackingFields formData={formData} onChange={onChange} />
        {/* Notes: wrap textarea inside <label> for native label/control association */}
        <label className="col-span-full block">
          <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            {t('jobDetails.notes', 'Notes')}
          </span>
          <textarea
            name="notes"
            value={formData.notes ?? ''}
            onChange={onChange}
            rows={4}
            className="w-full rounded border border-border p-2.5 bg-background text-foreground transition-colors focus:border-ring focus:ring-ring"
            data-testid="form-notes"
          />
        </label>
      </div>
    </form>
  );
};
