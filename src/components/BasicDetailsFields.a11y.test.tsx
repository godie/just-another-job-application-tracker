import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BasicDetailsFields } from './BasicDetailsFields';

const formData = {
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

describe('BasicDetailsFields accessibility', () => {
  it('associates work type labels with their selects', () => {
    render(<BasicDetailsFields formData={formData} onChange={vi.fn()} />);

    const workType = screen.getByLabelText(/work type/i);
    expect(workType).toHaveAttribute('id', 'job-form-work-type');
    expect(screen.getByText(/work type/i).closest('label')).toHaveAttribute('for', 'job-form-work-type');
  });
});
