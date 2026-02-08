// src/components/OpportunityForm.tsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type JobOpportunity } from '../utils/localStorage';

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800">{t('form.addOpportunityTitle')}</h3>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('form.position')}
              </label>
              <input
                type="text"
                value={formData.position}
                onChange={(e) => handleInputChange('position', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  errors.position ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Software Engineer"
              />
              {errors.position && (
                <p className="text-red-500 text-xs mt-1">{errors.position}</p>
              )}
            </div>

            <div>
              <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
                {t('form.company')}
              </label>
              <input
                id="company"
                type="text"
                value={formData.company}
                onChange={(e) => handleInputChange('company', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  errors.company ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Google"
              />
              {errors.company && (
                <p className="text-red-500 text-xs mt-1">{errors.company}</p>
              )}
            </div>

            <div>
              <label htmlFor="link" className="block text-sm font-medium text-gray-700 mb-1">
                {t('form.link')}
              </label>
              <input
                id="link"
                type="url"
                value={formData.link}
                onChange={(e) => handleInputChange('link', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  errors.link ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="https://linkedin.com/jobs/view/..."
              />
              {errors.link && (
                <p className="text-red-500 text-xs mt-1">{errors.link}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">{t('opportunities.table.location')}</label>
                <input
                  id="location"
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., Remote, San Francisco, CA"
                />
              </div>

              <div>
                <label htmlFor="jobType" className="block text-sm font-medium text-gray-700 mb-1">{t('opportunities.table.jobType')}</label>
                <input
                  id="jobType"
                  type="text"
                  value={formData.jobType}
                  onChange={(e) => handleInputChange('jobType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Remote/Hybrid/On-site"
                />
              </div>
            </div>

            <div>
              <label htmlFor="salary" className="block text-sm font-medium text-gray-700 mb-1">{t('fields.salary')}</label>
              <input
                id="salary"
                type="text"
                value={formData.salary}
                onChange={(e) => handleInputChange('salary', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="e.g., $120k - $150k"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">{t('form.description')}</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                placeholder="Job description or notes..."
              />
            </div>

            <div>
              <label htmlFor="postedDate" className="block text-sm font-medium text-gray-700 mb-1">{t('form.postedDate')}</label>
              <input
                id="postedDate"
                type="date"
                value={formData.postedDate}
                onChange={(e) => handleInputChange('postedDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500"
              >
                {t('form.saveOpportunity')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OpportunityForm;

