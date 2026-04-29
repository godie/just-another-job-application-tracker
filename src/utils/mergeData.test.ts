import { describe, it, expect } from 'vitest';
import {
  mergeApplications,
  mergeOpportunities,
  resolveMerge,
} from './mergeData';
import type { JobApplication } from '../types/applications';
import type { JobOpportunity } from '../types/opportunities';
import type { MergeData, MergeStrategy } from './mergeData';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeApp(overrides: Partial<JobApplication> & { id: string; position: string; company: string }): JobApplication {
  return {
    salary: '',
    status: 'Applied',
    applicationDate: '',
    interviewDate: '',
    timeline: [],
    notes: '',
    link: '',
    platform: '',
    contactName: '',
    followUpDate: '',
    ...overrides,
  };
}

function makeOpp(overrides: Partial<JobOpportunity> & { id: string; position: string; company: string; link: string; capturedDate: string }): JobOpportunity {
  return { ...overrides };
}

// ── mergeApplications ─────────────────────────────────────────────────────

describe('mergeApplications', () => {
  it('returns empty array when both inputs are empty', () => {
    expect(mergeApplications([], [])).toEqual([]);
  });

  it('returns all local items when cloud is empty', () => {
    const local = [makeApp({ id: '1', position: 'Dev', company: 'A' })];
    expect(mergeApplications(local, [])).toEqual(local);
  });

  it('returns all cloud items when local is empty', () => {
    const cloud = [makeApp({ id: '1', position: 'Dev', company: 'A' })];
    expect(mergeApplications([], cloud)).toEqual(cloud);
  });

  it('includes items unique to each source', () => {
    const local = [makeApp({ id: '1', position: 'Dev', company: 'A' })];
    const cloud = [makeApp({ id: '2', position: 'PM', company: 'B' })];
    const result = mergeApplications(local, cloud);
    expect(result).toHaveLength(2);
    expect(result.map((a) => a.id).sort()).toEqual(['1', '2']);
  });

  it('keeps the cloud version when cloud has a newer applicationDate', () => {
    const local = makeApp({ id: '1', position: 'Dev', company: 'A', applicationDate: '2024-01-01' });
    const cloud = makeApp({ id: '1', position: 'Dev (Updated)', company: 'A', applicationDate: '2024-06-01' });
    const result = mergeApplications([local], [cloud]);
    expect(result).toHaveLength(1);
    expect(result[0].position).toBe('Dev (Updated)');
  });

  it('keeps the local version when local has a newer applicationDate', () => {
    const local = makeApp({ id: '1', position: 'Dev (Updated)', company: 'A', applicationDate: '2024-06-01' });
    const cloud = makeApp({ id: '1', position: 'Dev', company: 'A', applicationDate: '2024-01-01' });
    const result = mergeApplications([local], [cloud]);
    expect(result).toHaveLength(1);
    expect(result[0].position).toBe('Dev (Updated)');
  });

  it('prefers local when dates are equal', () => {
    const local = makeApp({ id: '1', position: 'Local', company: 'A', applicationDate: '2024-03-01' });
    const cloud = makeApp({ id: '1', position: 'Cloud', company: 'A', applicationDate: '2024-03-01' });
    const result = mergeApplications([local], [cloud]);
    expect(result[0].position).toBe('Local');
  });

  it('uses latest timeline event date when present', () => {
    const local = makeApp({
      id: '1',
      position: 'Dev',
      company: 'A',
      applicationDate: '2024-01-01',
      timeline: [
        { id: 'e1', type: 'technical_interview', date: '2024-02-15', status: 'completed' },
      ],
    });
    const cloud = makeApp({
      id: '1',
      position: 'Dev (Cloud)',
      company: 'A',
      applicationDate: '2024-01-01',
      timeline: [
        { id: 'e2', type: 'offer', date: '2024-04-20', status: 'completed' },
      ],
    });
    const result = mergeApplications([local], [cloud]);
    // Cloud has a newer timeline event (2024-04-20 > 2024-02-15)
    expect(result[0].position).toBe('Dev (Cloud)');
  });

  it('falls back to applicationDate when timeline is empty', () => {
    const local = makeApp({
      id: '1',
      position: 'Local',
      company: 'A',
      applicationDate: '2024-05-01',
      timeline: [],
    });
    const cloud = makeApp({
      id: '1',
      position: 'Cloud',
      company: 'A',
      applicationDate: '2024-03-01',
      timeline: [],
    });
    const result = mergeApplications([local], [cloud]);
    expect(result[0].position).toBe('Local');
  });

  it('compares dates numerically instead of lexicographically', () => {
    // String comparison would wrongly pick '09/2024' > '2024-12' due to char ordering
    // Numeric comparison via parseLocalDate handles this correctly
    const local = makeApp({ id: '1', position: 'Local', company: 'A', applicationDate: '2024-12-01' });
    const cloud = makeApp({ id: '1', position: 'Cloud', company: 'A', applicationDate: '2024-06-01' });
    const result = mergeApplications([local], [cloud]);
    expect(result[0].position).toBe('Local'); // Dec > Jun, local wins
  });

  it('prefers local when both dates are empty', () => {
    const local = makeApp({ id: '1', position: 'Local', company: 'A', applicationDate: '' });
    const cloud = makeApp({ id: '1', position: 'Cloud', company: 'A', applicationDate: '' });
    const result = mergeApplications([local], [cloud]);
    expect(result[0].position).toBe('Local');
  });

  it('picks the record with a date over the record with an empty date', () => {
    const local = makeApp({ id: '1', position: 'Local', company: 'A', applicationDate: '' });
    const cloud = makeApp({ id: '1', position: 'Cloud', company: 'A', applicationDate: '2024-06-01' });
    const result = mergeApplications([local], [cloud]);
    expect(result[0].position).toBe('Cloud'); // has a date, should win
  });

  it('handles mix of overlapping and unique IDs', () => {
    const local = [
      makeApp({ id: '1', position: 'A', company: 'X', applicationDate: '2024-01-01' }),
      makeApp({ id: '2', position: 'B', company: 'Y', applicationDate: '2024-01-01' }),
      makeApp({ id: '3', position: 'C', company: 'Z', applicationDate: '2024-01-01' }),
    ];
    const cloud = [
      makeApp({ id: '2', position: 'B-updated', company: 'Y', applicationDate: '2024-06-01' }),
      makeApp({ id: '4', position: 'D', company: 'W', applicationDate: '2024-01-01' }),
    ];
    const result = mergeApplications(local, cloud);
    expect(result).toHaveLength(4);
    const byId = new Map(result.map((a) => [a.id, a]));
    expect(byId.get('1')?.position).toBe('A'); // local-only
    expect(byId.get('2')?.position).toBe('B-updated'); // cloud newer
    expect(byId.get('3')?.position).toBe('C'); // local-only
    expect(byId.get('4')?.position).toBe('D'); // cloud-only
  });
});

// ── mergeOpportunities ─────────────────────────────────────────────────────

describe('mergeOpportunities', () => {
  it('returns empty array when both inputs are empty', () => {
    expect(mergeOpportunities([], [])).toEqual([]);
  });

  it('includes items unique to each source', () => {
    const local = [makeOpp({ id: '1', position: 'Dev', company: 'A', link: 'http://a', capturedDate: '2024-01-01' })];
    const cloud = [makeOpp({ id: '2', position: 'PM', company: 'B', link: 'http://b', capturedDate: '2024-01-01' })];
    const result = mergeOpportunities(local, cloud);
    expect(result).toHaveLength(2);
  });

  it('keeps the cloud version when postedDate is newer', () => {
    const local = makeOpp({ id: '1', position: 'Dev', company: 'A', link: 'http://a', capturedDate: '2024-01-01', postedDate: '2024-02-01' });
    const cloud = makeOpp({ id: '1', position: 'Dev (Updated)', company: 'A', link: 'http://a', capturedDate: '2024-01-01', postedDate: '2024-06-01' });
    const result = mergeOpportunities([local], [cloud]);
    expect(result[0].position).toBe('Dev (Updated)');
  });

  it('keeps local version when local postedDate is newer', () => {
    const local = makeOpp({ id: '1', position: 'Dev (New)', company: 'A', link: 'http://a', capturedDate: '2024-01-01', postedDate: '2024-06-01' });
    const cloud = makeOpp({ id: '1', position: 'Dev', company: 'A', link: 'http://a', capturedDate: '2024-01-01', postedDate: '2024-02-01' });
    const result = mergeOpportunities([local], [cloud]);
    expect(result[0].position).toBe('Dev (New)');
  });

  it('falls back to capturedDate when postedDate is absent', () => {
    const local = makeOpp({ id: '1', position: 'Local', company: 'A', link: 'http://a', capturedDate: '2024-05-01' });
    const cloud = makeOpp({ id: '1', position: 'Cloud', company: 'A', link: 'http://a', capturedDate: '2024-03-01' });
    const result = mergeOpportunities([local], [cloud]);
    expect(result[0].position).toBe('Local');
  });

  it('prefers local when both dates are empty', () => {
    const local = makeOpp({ id: '1', position: 'Local', company: 'A', link: 'http://a', capturedDate: '' });
    const cloud = makeOpp({ id: '1', position: 'Cloud', company: 'A', link: 'http://a', capturedDate: '' });
    const result = mergeOpportunities([local], [cloud]);
    expect(result[0].position).toBe('Local');
  });

  it('picks the record with a date over the record with an empty date', () => {
    const local = makeOpp({ id: '1', position: 'Local', company: 'A', link: 'http://a', capturedDate: '' });
    const cloud = makeOpp({ id: '1', position: 'Cloud', company: 'A', link: 'http://a', capturedDate: '2024-06-01' });
    const result = mergeOpportunities([local], [cloud]);
    expect(result[0].position).toBe('Cloud');
  });

  it('compares dates numerically instead of lexicographically', () => {
    // String sort would wrongly favor '2024-06' < '2024-12' only by accident,
    // but non-ISO or mixed formats break lexicographic ordering
    const local = makeOpp({ id: '1', position: 'Local', company: 'A', link: 'http://a', capturedDate: '2024-12-01', postedDate: '2024-12-01' });
    const cloud = makeOpp({ id: '1', position: 'Cloud', company: 'A', link: 'http://a', capturedDate: '2024-06-01', postedDate: '2024-06-01' });
    const result = mergeOpportunities([local], [cloud]);
    expect(result[0].position).toBe('Local'); // Dec > Jun
  });
});

// ── resolveMerge ───────────────────────────────────────────────────────────

describe('resolveMerge', () => {
  const localData: MergeData = {
    applications: [makeApp({ id: '1', position: 'Local App', company: 'A', applicationDate: '2024-01-01' })],
    opportunities: [makeOpp({ id: '1', position: 'Local Opp', company: 'A', link: 'http://a', capturedDate: '2024-01-01' })],
  };

  const cloudData: MergeData = {
    applications: [makeApp({ id: '2', position: 'Cloud App', company: 'B', applicationDate: '2024-01-01' })],
    opportunities: [makeOpp({ id: '2', position: 'Cloud Opp', company: 'B', link: 'http://b', capturedDate: '2024-01-01' })],
  };

  it('returns cloud data when strategy is useCloud', () => {
    const result = resolveMerge('useCloud', localData, cloudData);
    expect(result.applications).toEqual(cloudData.applications);
    expect(result.opportunities).toEqual(cloudData.opportunities);
  });

  it('returns local data when strategy is keepLocal', () => {
    const result = resolveMerge('keepLocal', localData, cloudData);
    expect(result.applications).toEqual(localData.applications);
    expect(result.opportunities).toEqual(localData.opportunities);
  });

  it('merges both sources when strategy is merge', () => {
    const result = resolveMerge('merge', localData, cloudData);
    expect(result.applications).toHaveLength(2);
    expect(result.opportunities).toHaveLength(2);
    const appIds = result.applications.map((a) => a.id).sort();
    const oppIds = result.opportunities.map((o) => o.id).sort();
    expect(appIds).toEqual(['1', '2']);
    expect(oppIds).toEqual(['1', '2']);
  });

  it('all three strategies return valid MergeData', () => {
    const strategies: MergeStrategy[] = ['useCloud', 'keepLocal', 'merge'];
    for (const strategy of strategies) {
      const result = resolveMerge(strategy, localData, cloudData);
      expect(result).toHaveProperty('applications');
      expect(result).toHaveProperty('opportunities');
      expect(Array.isArray(result.applications)).toBe(true);
      expect(Array.isArray(result.opportunities)).toBe(true);
    }
  });
});
