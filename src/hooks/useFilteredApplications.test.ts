import { renderHook } from '@testing-library/react';
import { useFilteredApplications } from './useFilteredApplications';
import { type JobApplication } from '../types/applications';
import { type Filters } from '../components/FiltersBar';
import { describe, it, expect } from 'vitest';

const mockApplications: JobApplication[] = [
  {
    id: '1',
    position: 'Software Engineer',
    company: 'Tech Corp',
    status: 'Applied',
    applicationDate: '2023-01-01',
    timeline: [],
  },
  {
    id: '2',
    position: 'Frontend Developer',
    company: 'Web Inc',
    status: 'Interviewing',
    applicationDate: '2023-01-02',
    timeline: [],
  },
];

const defaultFilters: Filters = {
  search: '',
  status: '',
  statusInclude: [],
  statusExclude: [],
  platform: '',
  dateFrom: '',
  dateTo: '',
};

describe('useFilteredApplications referential identity', () => {
  it('should maintain referential identity for unchanged applications', () => {
    const { result, rerender } = renderHook(
      ({ applications, filters }) => useFilteredApplications(applications, filters),
      {
        initialProps: {
          applications: mockApplications,
          filters: defaultFilters,
        },
      }
    );

    const firstResult = result.current.filteredApplications;
    const firstApp1 = firstResult.find(a => a.id === '1');

    // Create a new applications array with one item updated but the other kept the same
    const updatedApplications: JobApplication[] = [
      mockApplications[0], // Same reference
      { ...mockApplications[1], status: 'Rejected' }, // New reference
    ];

    rerender({ applications: updatedApplications, filters: defaultFilters });

    const secondResult = result.current.filteredApplications;
    const secondApp1 = secondResult.find(a => a.id === '1');

    // This should now PASS with the optimization
    expect(secondApp1).toBe(firstApp1);

    const firstApp2 = firstResult.find(a => a.id === '2');
    const secondApp2 = secondResult.find(a => a.id === '2');

    // Changed applications SHOULD have new references
    expect(secondApp2).not.toBe(firstApp2);
    expect(secondApp2?.status).toBe('Rejected');
  });
});
