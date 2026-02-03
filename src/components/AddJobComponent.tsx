// src/components/AddJobForm.tsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { JobApplication, InterviewEvent, InterviewStageType } from '../utils/localStorage';
import { generateId } from '../utils/localStorage';
import useKeyboardEscape from '../hooks/useKeyboardEscape';
import TimelineEditor from './TimelineEditor';

interface AddJobFormProps {
  onSave: (newEntry: Omit<JobApplication, 'id'>) => void; // Acepta la entrada sin ID
  onCancel: () => void;
  initialData?: JobApplication | null; // Datos iniciales para edición
}

const initialFormData: Omit<JobApplication, 'id'> = {
  position: '',
  company: '',
  salary: '',
  status: 'Applied',
  applicationDate: new Date().toLocaleDateString('en-CA'), // Fecha de hoy por defecto (YYYY-MM-DD)
  interviewDate: '',
  notes: '',
  link: '',
  platform: 'LinkedIn',
  contactName: '',
  followUpDate: '',
  timeline: [],
};

// Helper to map status to timeline event type
const mapStatusToStageType = (status: string): InterviewStageType => {
  const statusMap: Record<string, InterviewStageType> = {
    'Applied': 'application_submitted',
    'Interviewing': 'technical_interview',
    'Offer': 'offer',
    'Rejected': 'rejected',
    'Withdrawn': 'withdrawn',
    'Hold': 'application_submitted',
  };
  return statusMap[status] || 'application_submitted';
};

// Helper to build timeline from form data
const buildTimeline = (data: Omit<JobApplication, 'id'> | JobApplication): InterviewEvent[] => {
  const timeline: InterviewEvent[] = [];
  
  // Add application submitted event
  if (data.applicationDate) {
    timeline.push({
      id: generateId(),
      type: 'application_submitted',
      date: data.applicationDate,
      status: 'completed',
    });
  }
  
  // Add interview/status event
  if (data.interviewDate) {
    const stageType = mapStatusToStageType(data.status);
    timeline.push({
      id: generateId(),
      type: stageType,
      date: data.interviewDate,
      status: data.status === 'Rejected' ? 'cancelled' : 'scheduled',
    });
  }
  
  return timeline;
};

const AddJobForm: React.FC<AddJobFormProps> = ({ onSave, onCancel, initialData }) => {
  const { t } = useTranslation();
  const isCreationMode = initialData && !initialData.id;
  const isEditing = !!initialData && !!initialData.id;
  
  // When creating a new entry, merge initialData with initialFormData to ensure defaults
  const getInitialFormData = () => {
    if (isEditing && initialData) {
      return initialData;
    }
    if (isCreationMode && initialData) {
      // Merge initialData with initialFormData to ensure all defaults are set
      return { ...initialFormData, ...initialData };
    }
    return initialFormData;
  };
  
  const [formData, setFormData] = useState<Omit<JobApplication, 'id'> | JobApplication>(
    getInitialFormData()
  );
  
  useKeyboardEscape(onCancel, true);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Ensure status has a default value
    const dataWithStatus = {
      ...formData,
      status: formData.status || 'Applied',
    };
    
    // Use manual timeline if exists, otherwise build from form data
    let timeline = dataWithStatus.timeline || [];
    if (timeline.length === 0) {
      timeline = buildTimeline(dataWithStatus);
    }
    
    const finalData = { ...dataWithStatus, timeline };
    onSave(finalData);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl p-8 overflow-y-auto max-h-[90vh]">
        <h2 className="text-3xl font-bold mb-6 text-indigo-700">
            {isEditing ? t('form.editTitle') : t('form.addTitle')}
        </h2>
        <form onSubmit={handleSubmit} data-testid="job-form">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Group 1: Required Details */}
            <div className="col-span-full border-b pb-2 mb-4">
              <p className="font-semibold text-lg text-gray-600">{t('form.basicDetails')}</p>
            </div>
            
            <label className="block">
              <span className="text-gray-700 font-medium">{t('form.position')}</span>
              <input
                type="text"
                name="position"
                value={formData.position}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                data-testid="form-position"
              />
            </label>
            
            <label className="block">
              <span className="text-gray-700 font-medium">{t('form.company')}</span>
              <input
                type="text"
                name="company"
                value={formData.company}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                data-testid="form-company"
              />
            </label>

            {/* Group 2: Dates and Status */}
            <div className="col-span-full border-b pb-2 mb-4 mt-4">
              <p className="font-semibold text-lg text-gray-600">{t('form.trackingTimeline')}</p>
            </div>

            <label className="block">
              <span className="text-gray-700 font-medium">{t('form.applicationDate')}</span>
              <input
                type="date"
                data-testid="form-application-date"
                name="applicationDate"
                value={formData.applicationDate}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
              />
            </label>

            <label className="block">
              <span className="text-gray-700 font-medium">{t('form.status')}</span>
              <select
                name="status"
                value={formData.status || 'Applied'}
                data-testid="form-status"
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border bg-white"
              >
                {['Applied', 'Interviewing', 'Offer', 'Rejected', 'Hold'].map(s => (
                  <option key={s} value={s}>{t(`statuses.${s.toLowerCase()}`)}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-gray-700 font-medium">{t('form.salary')}</span>
              <input
                type="text"
                name="salary"
                value={formData.salary}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
              />
            </label>

            <label className="block">
              <span className="text-gray-700 font-medium">{t('form.interviewDate')}</span>
              <input
                type="date"
                name="interviewDate"
                value={formData.interviewDate}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
              />
            </label>

            <label className="block">
              <span className="text-gray-700 font-medium">{t('form.followUpDate')}</span>
              <input
                type="date"
                name="followUpDate"
                value={formData.followUpDate}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
              />
            </label>

            <label className="block">
              <span className="text-gray-700 font-medium">{t('form.link')}</span>
              <input
                type="url"
                name="link"
                value={formData.link}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
              />
            </label>

            {/* Group 3: Auxiliary Details */}
            <div className="col-span-full border-b pb-2 mb-4 mt-4">
              <p className="font-semibold text-lg text-gray-600">{t('form.sourceContact')}</p>
            </div>
            
            <label className="block">
              <span className="text-gray-700 font-medium">{t('form.platform')}</span>
              <select
                data-testid="form-platform"
                name="platform"
                value={formData.platform}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border bg-white"
              >
                {['LinkedIn', 'Indeed', 'Company Website', 'Referral', 'Other'].map(p => (
                  <option key={p} value={p}>{t(`form.platforms.${p}`)}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-gray-700 font-medium">{t('form.contactName')}</span>
              <input
                type="text"
                name="contactName"
                data-testid="form-contact-name"
                value={formData.contactName}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
              />
            </label>
            
            <label className="block col-span-full">
              <span className="text-gray-700 font-medium">{t('form.notes')}</span>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
              />
            </label>
          </div>

          {/* Timeline Editor */}
          <div className="col-span-full mt-6">
            <TimelineEditor 
              events={formData.timeline || []} 
              onChange={(events) => setFormData(prev => ({ ...prev, timeline: events }))}
            />
          </div>

          {/* Form Actions */}
          <div className="mt-8 flex justify-end space-x-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-gray-700 hover:bg-gray-50 transition"
              data-testid="form-cancel"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 text-white rounded-md shadow-lg hover:bg-indigo-700 transition"
              data-testid="form-save"
            >
              {isEditing ? t('form.saveChanges') : t('form.saveApplication')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddJobForm;
