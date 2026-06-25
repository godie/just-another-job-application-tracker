import React from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from './ui/Input';
import type { JobApplication } from '../types/applications';

interface BasicDetailsFieldsProps {
  formData: Omit<JobApplication, 'id'> | JobApplication;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}

export const BasicDetailsFields: React.FC<BasicDetailsFieldsProps> = ({ formData, onChange }) => {
  const { t } = useTranslation();

  return (
    <>
      <div className="col-span-full border-b border-border pb-3 mb-6">
        <p className="text-base font-semibold text-muted-foreground">{t('form.basicDetails')}</p>
      </div>

      <Input
        label={t('form.position')}
        type="text"
        name="position"
        value={formData.position}
        onChange={onChange}
        required
        maxLength={200}
        data-testid="form-position"
      />

      <Input
        label={t('form.company')}
        type="text"
        name="company"
        value={formData.company}
        onChange={onChange}
        required
        maxLength={200}
        data-testid="form-company"
      />

      <Input
        label={t('form.location')}
        type="text"
        name="location"
        value={formData.location ?? ''}
        onChange={onChange}
        placeholder="e.g. Remote, San Francisco"
        maxLength={200}
        data-testid="form-location"
      />

      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">{t('form.workType')}</label>
        <select
          name="workType"
          value={formData.workType ?? ''}
          onChange={onChange}
          className="w-full rounded border-border shadow-sm focus:border-ring focus:ring-ring p-2.5 border bg-background text-foreground transition-colors"
          data-testid="form-work-type"
        >
          <option value="">{t('form.workTypeNone')}</option>
          <option value="remote">{t('form.workTypes.remote')}</option>
          <option value="on-site">{t('form.workTypes.onSite')}</option>
          <option value="hybrid">{t('form.workTypes.hybrid')}</option>
        </select>
      </div>

      {formData.workType === 'hybrid' && (
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">
            {t('form.hybridDaysInOffice')}
          </label>
          <select
            name="hybridDaysInOffice"
            value={formData.hybridDaysInOffice ?? ''}
            onChange={onChange}
            className="w-full rounded border-border shadow-sm focus:border-ring focus:ring-ring p-2.5 border bg-background text-foreground transition-colors"
            data-testid="form-hybrid-days"
          >
            <option value="">{t('form.hybridDaysNone')}</option>
            {[1, 2, 3, 4, 5].map((d) => (
              <option key={d} value={d}>
                {t('form.hybridDaysOption', { count: d })}
              </option>
            ))}
          </select>
        </div>
      )}
    </>
  );
};

export default BasicDetailsFields;
