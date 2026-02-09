import { describe, it, expect, beforeEach, vi } from 'vitest';
import { scanEmails, applyScanPreview } from './scanService';
import { FakeEmailProvider } from '../providers/fake/fakeProvider';
import { FAKE_MESSAGES } from '../providers/fake/fakeData';
import type { JobApplication } from '../../types/applications';

const mockAddApplication = vi.fn();
const mockUpdateApplication = vi.fn();
const mockGetState = vi.fn();

vi.mock('../../stores/applicationsStore', () => ({
  useApplicationsStore: {
    getState: () => mockGetState(),
  },
}));

describe('scanService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetState.mockReturnValue({
      applications: [],
      addApplication: mockAddApplication,
      updateApplication: mockUpdateApplication,
    });
  });

  describe('scanEmails', () => {
    it('returns preview with proposed additions and updates', async () => {
      const provider = new FakeEmailProvider(FAKE_MESSAGES);
      const preview = await scanEmails(provider);
      expect(preview).toHaveProperty('proposedAdditions');
      expect(preview).toHaveProperty('proposedUpdates');
      expect(Array.isArray(preview.proposedAdditions)).toBe(true);
      expect(Array.isArray(preview.proposedUpdates)).toBe(true);
    });

    it('proposed additions have id, data, source', async () => {
      const provider = new FakeEmailProvider(FAKE_MESSAGES);
      const preview = await scanEmails(provider);
      for (const a of preview.proposedAdditions) {
        expect(a.id).toBeDefined();
        expect(a.data).toHaveProperty('company');
        expect(a.data).toHaveProperty('position');
        expect(a.data).not.toHaveProperty('id');
        expect(a.source).toHaveProperty('subject');
        expect(a.source).toHaveProperty('date');
      }
    });

    it('does not add application_submitted if company already exists', async () => {
      const existing: JobApplication = {
        id: 'existing-1',
        company: 'acme',
        position: 'Engineer',
        salary: '',
        status: 'Applied',
        applicationDate: '2025-01-01',
        interviewDate: '',
        timeline: [],
        notes: '',
        link: '',
        platform: 'Web',
        contactName: '',
        followUpDate: '',
      };
      mockGetState.mockReturnValue({
        applications: [existing],
        addApplication: mockAddApplication,
        updateApplication: mockUpdateApplication,
      });
      const provider = new FakeEmailProvider(FAKE_MESSAGES);
      const preview = await scanEmails(provider);
      const acmeAdditions = preview.proposedAdditions.filter(
        (a) => a.data.company?.toLowerCase() === 'acme'
      );
      expect(acmeAdditions).toHaveLength(0);
    });
  });

  describe('applyScanPreview', () => {
    it('calls addApplication for each proposed addition', () => {
      const additions = [
        {
          id: 'add-1',
          data: {
            position: 'Dev',
            company: 'NewCo',
            salary: '',
            status: 'Applied',
            applicationDate: '2025-01-01',
            interviewDate: '',
            timeline: [],
            notes: '',
            link: '',
            platform: 'Email',
            contactName: '',
            followUpDate: '',
          },
          source: { subject: 'Thanks', date: '2025-01-01' },
        },
      ];
      const result = applyScanPreview(additions, []);
      expect(mockAddApplication).toHaveBeenCalledTimes(1);
      expect(mockAddApplication).toHaveBeenCalledWith(additions[0].data);
      expect(result.added).toBe(1);
      expect(result.updated).toBe(0);
    });

    it('calls updateApplication for each proposed update when app exists', () => {
      const app: JobApplication = {
        id: 'app-1',
        company: 'Acme',
        position: 'Engineer',
        salary: '',
        status: 'Applied',
        applicationDate: '2025-01-01',
        interviewDate: '',
        timeline: [],
        notes: '',
        link: '',
        platform: 'Web',
        contactName: '',
        followUpDate: '',
      };
      mockGetState.mockReturnValue({
        applications: [app],
        addApplication: mockAddApplication,
        updateApplication: mockUpdateApplication,
      });
      const updates = [
        {
          id: 'up-1',
          applicationId: 'app-1',
          company: 'Acme',
          position: 'Engineer',
          newEvent: {
            id: 'ev-1',
            type: 'rejected' as const,
            date: '2025-01-20',
            status: 'completed' as const,
          },
          source: { subject: 'Regret', date: '2025-01-20' },
        },
      ];
      const result = applyScanPreview([], updates);
      expect(mockUpdateApplication).toHaveBeenCalledWith('app-1', {
        timeline: [updates[0].newEvent],
      });
      expect(result.added).toBe(0);
      expect(result.updated).toBe(1);
    });
  });
});
