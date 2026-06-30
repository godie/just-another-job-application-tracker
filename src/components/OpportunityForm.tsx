import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { type JobOpportunity } from '../types/opportunities';
import useFocusTrap from '../hooks/useFocusTrap';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';

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

  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, isOpen);

  if (!isOpen) return null;

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
    <dialog 
      open
      className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      aria-modal="true"
      aria-labelledby="opportunity-form-title"
    >
      <div ref={modalRef}>
        <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto p-0">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 id="opportunity-form-title" className="text-xl font-semibold text-foreground">{t('form.addOpportunityTitle')}</h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="text-muted-foreground hover:text-foreground text-2xl leading-none p-1"
              aria-label="Close dialog"
            >
              <span aria-hidden="true">×</span>
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="opportunity-position"
              label={t('form.position')}
              type="text"
              value={formData.position}
              onChange={(e) => handleInputChange('position', e.target.value)}
              error={errors.position}
              placeholder="e.g., Software Engineer"
              maxLength={200}
            />

            <Input
              id="opportunity-company"
              label={t('form.company')}
              type="text"
              value={formData.company}
              onChange={(e) => handleInputChange('company', e.target.value)}
              error={errors.company}
              placeholder="e.g., Google"
              maxLength={200}
            />

            <Input
              id="opportunity-link"
              label={t('form.link')}
              type="url"
              value={formData.link}
              onChange={(e) => handleInputChange('link', e.target.value)}
              error={errors.link}
              placeholder="https://linkedin.com/jobs/view/..."
              maxLength={500}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                id="opportunity-location"
                label={t('opportunities.table.location')}
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="e.g., Remote, San Francisco, CA"
                maxLength={200}
              />

              <Input
                id="opportunity-job-type"
                label={t('opportunities.table.jobType')}
                type="text"
                value={formData.jobType}
                onChange={(e) => handleInputChange('jobType', e.target.value)}
                placeholder="Remote/Hybrid/On-site"
                maxLength={100}
              />
            </div>

            <Input
              id="opportunity-salary"
              label={t('fields.salary')}
              type="text"
              value={formData.salary}
              onChange={(e) => handleInputChange('salary', e.target.value)}
              placeholder="e.g., $120k - $150k"
              maxLength={100}
            />

            <div>
              <label htmlFor="opportunity-description" className="block text-xs font-semibold text-muted-foreground mb-1">
                {t('form.description')}
              </label>
              <textarea
                id="opportunity-description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={4}
                maxLength={2000}
                aria-label={t('form.description')}
                className='w-full rounded border border-border px-3 py-2 text-sm bg-background text-foreground placeholder-muted-foreground focus:border-ring focus:ring-ring resize-none'
                placeholder="Job description or notes..."
              />
              <p className='text-xs text-muted-foreground mt-1'>
                {(formData.description || '').length}/2000
              </p>
            </div>

            <Input
              id="opportunity-posted-date"
              label={t('form.postedDate')}
              type="date"
              value={formData.postedDate}
              onChange={(e) => handleInputChange('postedDate', e.target.value)}
              maxLength={50}
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
    </dialog>
  );
};

export default OpportunityForm;
