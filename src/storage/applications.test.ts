import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getApplications, isLegacyApplication, migrateApplicationData } from './applications';
import { STORAGE_KEY } from '../utils/constants';
import { LegacyJobApplication } from '../types/applications';

describe('Storage Migration', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('identifies legacy applications correctly', () => {
    const legacyApp = {
      id: '1',
      position: 'Dev',
      company: 'Acme',
      status: 'Applied',
      applicationDate: '2023-01-01',
      // No timeline property
    };

    const modernApp = {
      id: '2',
      position: 'Dev',
      company: 'Acme',
      status: 'Applied',
      timeline: []
    };

    expect(isLegacyApplication(legacyApp)).toBe(true);
    expect(isLegacyApplication(modernApp)).toBe(false);
  });

  it('migrates legacy application data correctly', () => {
    const legacyApp: LegacyJobApplication = {
      id: '1',
      position: 'Dev',
      company: 'Acme',
      status: 'Applied',
      applicationDate: '2023-01-01',
      salary: '100k',
      notes: 'Some notes',
      link: 'http://example.com',
      platform: 'LinkedIn',
      contactName: 'John Doe',
      followUpDate: '2023-01-08'
    };

    const migrated = migrateApplicationData(legacyApp);

    expect(migrated.timeline).toBeDefined();
    expect(migrated.timeline.length).toBe(1);
    expect(migrated.timeline[0].type).toBe('application_submitted');
    expect(migrated.timeline[0].date).toBe('2023-01-01');
    expect(migrated.position).toBe('Dev');
  });

  it('getApplications migrates data in-memory without scheduling setTimeout', async () => {
    const legacyApps = [
      {
        id: '1',
        position: 'Dev',
        company: 'Acme',
        status: 'Applied',
        applicationDate: '2023-01-01'
      }
    ];

    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacyApps));

    // Spy on setTimeout to ensure it's NOT called for migration anymore
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout');

    const apps = getApplications();

    expect(apps.length).toBe(1);
    expect(apps[0].timeline).toBeDefined();
    expect(apps[0].timeline.length).toBeGreaterThan(0);

    // Verify NO setTimeout was called for migration
    // (Note: getApplications might be called by other things if we weren't in a clean test)
    expect(setTimeoutSpy).not.toHaveBeenCalled();

    setTimeoutSpy.mockRestore();
  });
});
