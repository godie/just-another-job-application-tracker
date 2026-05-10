// src/components/AddJobForm.tsx
import React, { useState, useRef, useEffect } from 'react';
import { getLocalDateString } from '../utils/dateHelpers';
import { useTranslation } from 'react-i18next';
import type { JobApplication } from '../types/applications';
import { toWorkType, buildInitialTimeline } from '../utils/applications';
import useKeyboardEscape from '../hooks/useKeyboardEscape';
import useFocusTrap from '../hooks/useFocusTrap';
import TimelineEditor from './TimelineEditor';
import { Button, Input, Select, Card } from './ui';

interface AddJobFormProps {
  onSave: (newEntry: Omit<JobApplication, 'id'>) => void;
  onCancel: () => void;
  initialData?: JobApplication | null;
}

const initialFormData: Omit<JobApplication, 'id'> = {
  position: '',
  company: '',
  location: '',
  workType: undefined,
  hybridDaysInOffice: undefined,
  salary: '',
  status: 'Applied',
  applicationDate: '',
  interviewDate: '',
  notes: '',
  link: '',
  platform: 'LinkedIn',
  contactName: '',
  followUpDate: '',
  timeline: [],
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
    () => getInitialFormData()
  );

  useEffect(() => {
    if (!initialData) {
      setFormData(prev => {
        const p = prev as Omit<JobApplication, 'id'>;
        if (!p.applicationDate) {
          return { ...p, applicationDate: getLocalDateString() };
        }
        return prev;
      });
    }
  }, [initialData]);

  useKeyboardEscape(onCancel, true);

  // Focus trap for modal accessibility
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef);

  const updateFormField = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'hybridDaysInOffice') {
      const num = value === '' ? undefined : parseInt(value, 10);
      setFormData(prev => ({ ...prev, hybridDaysInOffice: num }));
      return;
    }
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
      timeline = buildInitialTimeline(
        dataWithStatus.applicationDate,
        dataWithStatus.status,
        dataWithStatus.interviewDate
      );
    }
    
    const validWorkType = toWorkType(dataWithStatus.workType);
    const hybridDaysInOffice =
      validWorkType === 'hybrid' && typeof dataWithStatus.hybridDaysInOffice === 'number'
        ? dataWithStatus.hybridDaysInOffice
        : undefined;
    const finalData = {
      ...dataWithStatus,
      timeline,
      location: dataWithStatus.location || undefined,
      workType: validWorkType,
      hybridDaysInOffice,
    };
    onSave(finalData);
  };

  return (
    <div 
      className='fixed inset-0 bg-earth-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50'
      role='dialog'
      aria-modal='true'
      aria-labelledby='add-job-form-title'
    >
      <div ref={modalRef}>
        <Card className='w-full max-w-4xl p-8 overflow-y-auto max-h-[90vh] border border-earth-200 dark:border-earth-700'>
        <h2 id='add-job-form-title' className='font-serif text-3xl font-semibold mb-8 text-earth-800 dark:text-earth-100'>
            {isEditing ? t('form.editTitle') : t('form.addTitle')}
        </h2>
        <form onSubmit={handleSubmit} data-testid='job-form'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            
            {/* Group 1: Required Details */}
            <div className='col-span-full border-b border-earth-200 dark:border-earth-700 pb-3 mb-6'>
              <p className='font-serif text-base font-semibold text-earth-600 dark:text-earth-400'>{t('form.basicDetails')}</p>
            </div>
            
            <Input
              label={t('form.position')}
              type='text'
              name='position'
              value={formData.position}
              onChange={updateFormField}
              required
              maxLength={200}
              data-testid='form-position'
            />
            
            <Input
              label={t('form.company')}
              type='text'
              name='company'
              value={formData.company}
              onChange={updateFormField}
              required
              maxLength={200}
              data-testid='form-company'
            />

            <label className='block'>
              <span className='text-xs font-semibold text-earth-600 dark:text-earth-400 mb-1 block'>{t('form.location')}</span>
              <input
                type='text'
                name='location'
                value={formData.location ?? ''}
                onChange={updateFormField}
                placeholder='e.g. Remote, San Francisco'
                maxLength={200}
                className='w-full rounded border-earth-300 dark:border-earth-600 focus:border-sage-500 dark:focus:border-sage-400 focus:ring-sage-500 dark:focus:ring-sage-400 p-2.5 border bg-white dark:bg-earth-800 text-earth-900 dark:text-earth-100 transition-colors'
                data-testid='form-location'
              />
            </label>

            <label className='block'>
              <span className='text-xs font-semibold text-earth-600 dark:text-earth-400 mb-1 block'>{t('form.workType')}</span>
              <select
                name='workType'
                value={formData.workType ?? ''}
                onChange={updateFormField}
                className='w-full rounded border-earth-300 dark:border-earth-600 shadow-sm focus:border-sage-500 dark:focus:border-sage-400 focus:ring-sage-500 dark:focus:ring-sage-400 p-2.5 border bg-white dark:bg-earth-800 text-earth-900 dark:text-earth-100 transition-colors'
                data-testid='form-work-type'
              >
                <option value=''>{t('form.workTypeNone')}</option>
                <option value='remote'>{t('form.workTypes.remote')}</option>
                <option value='on-site'>{t('form.workTypes.onSite')}</option>
                <option value='hybrid'>{t('form.workTypes.hybrid')}</option>
              </select>
            </label>

            {formData.workType === 'hybrid' && (
              <label className='block'>
                <span className='text-xs font-semibold text-earth-600 dark:text-earth-400 mb-1 block'>{t('form.hybridDaysInOffice')}</span>
                <select
                  name='hybridDaysInOffice'
                  value={formData.hybridDaysInOffice ?? ''}
                  onChange={updateFormField}
                  className='w-full rounded border-earth-300 dark:border-earth-600 shadow-sm focus:border-sage-500 dark:focus:border-sage-400 focus:ring-sage-500 dark:focus:ring-sage-400 p-2.5 border bg-white dark:bg-earth-800 text-earth-900 dark:text-earth-100 transition-colors'
                  data-testid='form-hybrid-days'
                >
                  <option value=''>{t('form.hybridDaysNone')}</option>
                  {[1, 2, 3, 4, 5].map((d) => (
                    <option key={d} value={d}>
                      {t('form.hybridDaysOption', { count: d })}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {/* Group 2: Dates and Status */}
            <div className='col-span-full border-b border-earth-200 dark:border-earth-700 pb-3 mb-6 mt-4'>
              <p className='font-serif text-base font-semibold text-earth-600 dark:text-earth-400'>{t('form.trackingTimeline')}</p>
            </div>

            <Input
              label={t('form.applicationDate')}
              type='date'
              data-testid='form-application-date'
              name='applicationDate'
              value={formData.applicationDate}
              onChange={updateFormField}
              required
            />

            <Select
              label={t('form.status')}
              name='status'
              value={formData.status || 'Applied'}
              data-testid='form-status'
              onChange={updateFormField}
              required
            >
              {['Applied', 'Interviewing', 'Offer', 'Rejected', 'Hold'].map(s => (
                <option key={s} value={s}>{t(`statuses.${s.toLowerCase()}`)}</option>
              ))}
            </Select>

            <Input
              label={t('form.salary')}
              type='text'
              name='salary'
              value={formData.salary}
              onChange={updateFormField}
              maxLength={100}
            />

            <Input
              label={t('form.interviewDate')}
              type='date'
              name='interviewDate'
              value={formData.interviewDate}
              onChange={updateFormField}
            />

            <Input
              label={t('form.followUpDate')}
              type='date'
              name='followUpDate'
              value={formData.followUpDate}
              onChange={updateFormField}
            />

            <Input
              label={t('form.link')}
              type='url'
              name='link'
              value={formData.link}
              onChange={updateFormField}
              maxLength={500}
            />

            {/* Group 3: Auxiliary Details */}
            <div className='col-span-full border-b border-earth-200 dark:border-earth-700 pb-3 mb-6 mt-4'>
              <p className='font-serif text-base font-semibold text-earth-600 dark:text-earth-400'>{t('form.sourceContact')}</p>
            </div>
            
            <Select
              label={t('form.platform')}
              data-testid='form-platform'
              name='platform'
              value={formData.platform}
              onChange={updateFormField}
            >
              {['LinkedIn', 'Indeed', 'Company Website', 'Referral', 'Other'].map(p => (
                <option key={p} value={p}>{t(`form.platforms.${p}`)}</option>
              ))}
            </Select>

            <Input
              label={t('form.contactName')}
              type='text'
              name='contactName'
              data-testid='form-contact-name'
              value={formData.contactName}
              onChange={updateFormField}
              maxLength={100}
              placeholder="e.g., John Smith"
            />
            
            <div className='col-span-full'>
              <label className='block text-xs font-semibold text-earth-600 dark:text-earth-400 mb-1'>
                {t('form.notes')}
              </label>
              <textarea
                name='notes'
                value={formData.notes}
                onChange={updateFormField}
                rows={3}
                maxLength={2000}
                className='w-full rounded border-earth-300 dark:border-earth-600 px-3 py-2.5 text-sm bg-white dark:bg-earth-700 text-earth-900 dark:text-earth-100 placeholder-earth-400 dark:placeholder-earth-500 focus:border-sage-500 focus:ring-sage-500 transition-colors resize-none'
              />
              <p className='text-xs text-earth-400 dark:text-earth-500 mt-1'>
                {(formData.notes || '').length}/2000
              </p>
            </div>
          </div>

          {/* Timeline Editor */}
          <div className='col-span-full mt-8'>
            <TimelineEditor 
              events={formData.timeline || []} 
              onChange={(events) => setFormData(prev => ({ ...prev, timeline: events }))}
            />
          </div>

          {/* Form Actions */}
          <div className='mt-10 flex justify-end gap-4'>
            <Button
              variant='outline'
              type='button'
              onClick={onCancel}
              data-testid='form-cancel'
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant='primary'
              type='submit'
              data-testid='form-save'
            >
              {isEditing ? t('form.saveChanges') : t('form.saveApplication')}
            </Button>
          </div>
        </form>
        </Card>
      </div>
    </div>
  );
};

export default AddJobForm;