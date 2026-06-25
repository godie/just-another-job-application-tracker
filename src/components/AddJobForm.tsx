import React, { useState, useRef } from 'react';
import { getLocalDateString } from '../utils/dateHelpers';
import { useTranslation } from 'react-i18next';
import type { JobApplication } from '../types/applications';
import { toWorkType, buildInitialTimeline } from '../utils/applications';
import useKeyboardEscape from '../hooks/useKeyboardEscape';
import useFocusTrap from '../hooks/useFocusTrap';
import TimelineEditor from './TimelineEditor';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { BasicDetailsFields } from './BasicDetailsFields';
import { TrackingFields } from './TrackingFields';
import { SourceFields } from './SourceFields';

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
  
  const getInitialFormData = () => {
    if (isEditing && initialData) {
      return initialData;
    }
    if (isCreationMode && initialData) {
      return { ...initialFormData, ...initialData };
    }
    return initialFormData;
  };
  
  const [formData, setFormData] = useState<Omit<JobApplication, 'id'> | JobApplication>(
    () => {
      const data = getInitialFormData();
      if (!data.applicationDate) {
        return { ...data, applicationDate: getLocalDateString() };
      }
      return data;
    }
  );

  useKeyboardEscape(onCancel, true);

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
    
    const dataWithStatus = {
      ...formData,
      status: formData.status || 'Applied',
    };
    
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
    <dialog 
      open
      className='fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50'
      aria-modal='true'
      aria-labelledby='add-job-form-title'
    >
      <div ref={modalRef}>
        <Card className='w-full max-w-4xl p-8 overflow-y-auto max-h-[90vh] border border-border'>
        <h2 id='add-job-form-title' className='text-3xl font-semibold mb-8 text-foreground'>
            {isEditing ? t('form.editTitle') : t('form.addTitle')}
        </h2>
        <form onSubmit={handleSubmit} data-testid='job-form'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <BasicDetailsFields formData={formData} onChange={updateFormField} />
            <TrackingFields formData={formData} onChange={updateFormField} />
            <SourceFields formData={formData} onChange={updateFormField} />
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
    </dialog>
  );
};

export default AddJobForm;