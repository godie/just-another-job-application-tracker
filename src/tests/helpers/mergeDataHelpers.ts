// src/tests/helpers/mergeDataHelpers.ts
import type { JobApplication } from '../../types/applications';
import type { JobOpportunity } from '../../types/opportunities';
import type { MergeData } from '../../utils/mergeData';

export function createMockApplication(overrides: Partial<JobApplication> = {}): JobApplication {
  return {
    id: `app-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    position: 'Software Engineer',
    company: 'Test Company',
    location: 'Remote',
    salary: '$100k',
    status: 'applied',
    applicationDate: '2024-01-15',
    interviewDate: '',
    timeline: [],
    notes: '',
    link: '',
    platform: 'LinkedIn',
    contactName: '',
    followUpDate: '',
    ...overrides,
  };
}

export function createMockOpportunity(overrides: Partial<JobOpportunity> = {}): JobOpportunity {
  return {
    id: `opp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    position: 'Frontend Developer',
    company: 'Opportunity Co',
    link: 'https://example.com/job',
    capturedDate: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockMergeData(overrides: Partial<MergeData> = {}): MergeData {
  return {
    applications: [createMockApplication()],
    opportunities: [createMockOpportunity()],
    ...overrides,
  };
}

export function createConflictData(): {
  localData: MergeData;
  cloudData: MergeData;
} {
  const sharedApp = createMockApplication({ id: 'shared-1' });
  const localOnlyApp = createMockApplication({ id: 'local-1', position: 'Local Only' });
  const cloudOnlyApp = createMockApplication({ id: 'cloud-1', position: 'Cloud Only' });
  const sharedOpp = createMockOpportunity({ id: 'shared-opp-1' });
  const localOnlyOpp = createMockOpportunity({ id: 'local-opp-1', position: 'Local Opp Only' });
  const cloudOnlyOpp = createMockOpportunity({ id: 'cloud-opp-1', position: 'Cloud Opp Only' });

  return {
    localData: {
      applications: [sharedApp, localOnlyApp],
      opportunities: [sharedOpp, localOnlyOpp],
    },
    cloudData: {
      applications: [{ ...sharedApp, status: 'interviewing' }, cloudOnlyApp],
      opportunities: [{ ...sharedOpp, postedDate: '2024-02-01' }, cloudOnlyOpp],
    },
  };
}
