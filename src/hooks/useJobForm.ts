import React, { useState, useEffect } from 'react';
import { getLocalDateString } from '../utils/dateHelpers';
import type { JobApplication } from '../types/applications';
import { toWorkType, buildInitialTimeline } from '../utils/applications';

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

interface UseJobFormProps {
  initialData?: JobApplication | null;
  onSave: (data: Omit<JobApplication, 'id'> | JobApplication) => void;
}

export const useJobForm = ({ initialData, onSave }: UseJobFormProps) => {
  const isEditing = !!initialData && !!initialData.id;
  const isCreationMode = initialData && !initialData.id;

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
      setFormData((prev) => {
        const p = prev as Omit<JobApplication, 'id'>;
        if (!p.applicationDate) {
          return { ...p, applicationDate: getLocalDateString() };
        }
        return prev;
      });
    }
  }, [initialData]);

  const updateFormField = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name === 'hybridDaysInOffice') {
      const num = value === '' ? undefined : parseInt(value, 10);
      setFormData((prev) => ({ ...prev, hybridDaysInOffice: num }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
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

  return {
    formData,
    setFormData,
    updateFormField,
    handleSubmit,
    isEditing,
  };
};
