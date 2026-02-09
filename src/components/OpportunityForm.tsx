// src/components/OpportunityForm.tsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type JobOpportunity } from '../utils/localStorage';
import { Button, Input, Card } from './ui';

interface OpportunityFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (opportunity: Omit<JobOpportunity, 'id' | 'capturedDate'>) => void;
}

const OpportunityForm: React.FC<OpportunityFormProps> = ({ isOpen, onClose, onSave }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Omit<JobOpportunity, 'id' | 'capturedDate'>>({
    position: '',
    company: '',
    link: '',
    description: '',
    location: '',
    jobType: '',
    salary: '',
    postedDate: '',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  if (!isOpen) return null;

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.position.trim()) {
      newErrors.position = t('form.validation.positionRequired');
    }
    if (!formData.company.trim()) {
      newErrors.company = t('form.validation.companyRequired');
    }
    if (!formData.link.trim()) {
      newErrors.link = t('form.validation.linkRequired');
    } else {
      // Basic URL validation
      try {
        new URL(formData.link);
      } catch {
        newErrors.link = t('form.validation.invalidUrl');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    onSave(formData);
    
    // Reset form
    setFormData({
      position: '',
      company: '',
      link: '',
      description: '',
      location: '',
      jobType: '',
      salary: '',
      postedDate: '',
    });
    setErrors({});
    onClose();
  };

  const handleCancel = () => {
    setFormData({
      position: '',
      company: '',
      link: '',
      description: '',
      location: '',
      jobType: '',
      salary: '',
      postedDate: '',
    });
    setErrors({});
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto p-0">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">{t('form.addOpportunityTitle')}</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              ×
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={t('form.position')}
              type="text"
              value={formData.position}
              onChange={(e) => handleInputChange('position', e.target.value)}
              error={errors.position}
              placeholder="e.g., Software Engineer"
            />

            <Input
              id="company"
              label={t('form.company')}
              type="text"
              value={formData.company}
              onChange={(e) => handleInputChange('company', e.target.value)}
              error={errors.company}
              placeholder="e.g., Google"
            />

            <Input
              id="link"
              label={t('form.link')}
              type="url"
              value={formData.link}
              onChange={(e) => handleInputChange('link', e.target.value)}
              error={errors.link}
              placeholder="https://linkedin.com/jobs/view/..."
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                id="location"
                label={t('opportunities.table.location')}
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="e.g., Remote, San Francisco, CA"
              />

              <Input
                id="jobType"
                label={t('opportunities.table.jobType')}
                type="text"
                value={formData.jobType}
                onChange={(e) => handleInputChange('jobType', e.target.value)}
                placeholder="Remote/Hybrid/On-site"
              />
            </div>

            <Input
              id="salary"
              label={t('fields.salary')}
              type="text"
              value={formData.salary}
              onChange={(e) => handleInputChange('salary', e.target.value)}
              placeholder="e.g., $120k - $150k"
            />

            <div>
              <label htmlFor="description" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                {t('form.description')}
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-500 focus:ring-indigo-500 resize-none"
                placeholder="Job description or notes..."
              />
            </div>

            <Input
              id="postedDate"
              label={t('form.postedDate')}
              type="date"
              value={formData.postedDate}
              onChange={(e) => handleInputChange('postedDate', e.target.value)}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                variant="primary"
              >
                {t('form.saveOpportunity')}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default OpportunityForm;

