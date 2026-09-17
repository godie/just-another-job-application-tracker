import { describe, it, expect, beforeEach, vi } from 'vitest';
import { scanEmails, applyScanPreview, deduplicateEmails } from './scanService';
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

vi.mock('../../utils/applicationMatch', () => ({
  matchEmailToApplication: vi.fn(),
}));

vi.mock('../../utils/emailClassification', () => ({
  classifyEmailsWithJudgment: vi.fn(),
}));

import { matchEmailToApplication } from '../../utils/applicationMatch';
import { classifyEmailsWithJudgment } from '../../utils/emailClassification';

const mockedMatchEmailToApplication = vi.mocked(matchEmailToApplication);
const mockedClassifyEmails = vi.mocked(classifyEmailsWithJudgment);

describe('scanService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedClassifyEmails.mockResolvedValue(new Map());
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

    it('deduplicates emails with same subject/from/date found by multiple queries', async () => {
      const duplicateMessages = [
        {
          id: 'dup-1',
          subject: 'Thank you for applying',
          from: 'hr@acme.com',
          body: 'We received your application for the Engineer role.',
          internalDate: String(Date.now() - 1000 * 60 * 60 * 24 * 3),
        },
        {
          id: 'dup-2',
          subject: 'Thank you for applying',
          from: 'hr@acme.com',
          body: 'We received your application for the Engineer role.',
          internalDate: String(Date.now() - 1000 * 60 * 60 * 24 * 3), // same day
        },
      ];
      const provider = new FakeEmailProvider(duplicateMessages);
      const preview = await scanEmails(provider);
      const acmeAdditions = preview.proposedAdditions.filter(
        (a) => a.data.company?.toLowerCase() === 'acme'
      );
      expect(acmeAdditions).toHaveLength(1);
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

  describe('deduplicateEmails', () => {
    const makeEmail = (overrides: Partial<{ id: string; subject: string; from: string; body: string; date: string }> & { id: string }) => ({
      subject: 'Test Subject',
      from: 'hr@acme.com',
      body: 'Test body',
      date: '2025-01-15T10:00:00Z',
      ...overrides,
    });

    it('returns all emails when no duplicates', () => {
      const emails = [
        makeEmail({ id: '1', subject: 'App received', from: 'a@co.com', date: '2025-01-10T10:00:00Z' }),
        makeEmail({ id: '2', subject: 'Interview invite', from: 'b@co.com', date: '2025-01-11T10:00:00Z' }),
      ];
      expect(deduplicateEmails(emails)).toHaveLength(2);
    });

    it('deduplicates emails with same subject, from, and date', () => {
      const emails = [
        makeEmail({ id: '1', subject: 'Application received', from: 'hr@acme.com', date: '2025-01-15T10:00:00Z' }),
        makeEmail({ id: '2', subject: 'Application received', from: 'hr@acme.com', date: '2025-01-15T12:00:00Z' }), // same day
      ];
      const result = deduplicateEmails(emails);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1'); // keeps first occurrence
    });

    it('keeps emails with same subject and from but different dates', () => {
      const emails = [
        makeEmail({ id: '1', subject: 'Update', from: 'hr@acme.com', date: '2025-01-10T10:00:00Z' }),
        makeEmail({ id: '2', subject: 'Update', from: 'hr@acme.com', date: '2025-01-15T10:00:00Z' }), // different day
      ];
      expect(deduplicateEmails(emails)).toHaveLength(2);
    });

    it('deduplication is case-insensitive on subject and from', () => {
      const emails = [
        makeEmail({ id: '1', subject: 'Application Received', from: 'HR@Acme.com', date: '2025-01-15T10:00:00Z' }),
        makeEmail({ id: '2', subject: 'application received', from: 'hr@acme.com', date: '2025-01-15T10:00:00Z' }),
      ];
      expect(deduplicateEmails(emails)).toHaveLength(1);
    });

    it('trims whitespace in subject and from for dedup', () => {
      const emails = [
        makeEmail({ id: '1', subject: '  Application  ', from: '  hr@acme.com  ', date: '2025-01-15T10:00:00Z' }),
        makeEmail({ id: '2', subject: 'Application', from: 'hr@acme.com', date: '2025-01-15T10:00:00Z' }),
      ];
      expect(deduplicateEmails(emails)).toHaveLength(1);
    });

    it('keeps emails with same subject but different from', () => {
      const emails = [
        makeEmail({ id: '1', subject: 'Interview', from: 'a@co.com', date: '2025-01-15T10:00:00Z' }),
        makeEmail({ id: '2', subject: 'Interview', from: 'b@co.com', date: '2025-01-15T10:00:00Z' }),
      ];
      expect(deduplicateEmails(emails)).toHaveLength(2);
    });

    it('does NOT deduplicate when from has display name vs bare email', () => {
      const emails = [
        makeEmail({ id: '1', subject: 'Interview', from: 'Acme Corp <hr@acme.com>', date: '2025-01-15T10:00:00Z' }),
        makeEmail({ id: '2', subject: 'Interview', from: 'hr@acme.com', date: '2025-01-15T10:00:00Z' }),
      ];
      expect(deduplicateEmails(emails)).toHaveLength(2);
    });

    it('handles empty array', () => {
      expect(deduplicateEmails([])).toHaveLength(0);
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

  describe('AI judgment fallback for company-name variants', () => {
    const interviewEmail = {
      id: 'm-interview',
      subject: 'Interview invitation for Senior Engineer at Acme',
      from: 'recruiter@acme.com',
      body: 'We would like to schedule an interview next week.',
      internalDate: String(Date.now() - 1000 * 60 * 60 * 24),
    };

    const variantApplication = {
      id: 'app-1',
      position: 'Senior Engineer',
      company: 'ACME, Inc.',
      status: 'interviewing',
      applicationDate: '2026-01-10',
      timeline: [],
    } as JobApplication;

    it('attaches the update when the judgment matches a variant company name', async () => {
      mockGetState.mockReturnValue({
        applications: [variantApplication],
        addApplication: mockAddApplication,
        updateApplication: mockUpdateApplication,
      });
      mockedMatchEmailToApplication.mockResolvedValue({
        applicationId: 'app-1',
        verdict: 'auto',
        confidence: 0.88,
      });

      const preview = await scanEmails(new FakeEmailProvider([interviewEmail]));

      expect(mockedMatchEmailToApplication).toHaveBeenCalledTimes(1);
      expect(preview.proposedUpdates).toHaveLength(1);
      expect(preview.proposedUpdates[0].applicationId).toBe('app-1');
      expect(preview.proposedUpdates[0].company).toBe('ACME, Inc.');
      expect(preview.proposedUpdates[0].needsReview).toBeFalsy();
    });

    it('marks a mid-confidence match for review', async () => {
      mockGetState.mockReturnValue({
        applications: [variantApplication],
        addApplication: mockAddApplication,
        updateApplication: mockUpdateApplication,
      });
      mockedMatchEmailToApplication.mockResolvedValue({
        applicationId: 'app-1',
        verdict: 'review',
        confidence: 0.61,
      });

      const preview = await scanEmails(new FakeEmailProvider([interviewEmail]));

      expect(preview.proposedUpdates[0].needsReview).toBe(true);
    });

    it('keeps the previous behaviour when the judgment is unavailable', async () => {
      mockGetState.mockReturnValue({
        applications: [variantApplication],
        addApplication: mockAddApplication,
        updateApplication: mockUpdateApplication,
      });
      mockedMatchEmailToApplication.mockResolvedValue(null);

      const preview = await scanEmails(new FakeEmailProvider([interviewEmail]));

      expect(preview.proposedUpdates).toHaveLength(0);
    });
  });

  describe('AI email classification', () => {
    const application = {
      id: 'app-1',
      position: 'Senior Engineer',
      company: 'Acme',
      status: 'interviewing',
      applicationDate: '2026-01-10',
      timeline: [],
    } as JobApplication;

    // Wording the keyword cascade has no rule for (no 'regret'/'lamentamos'/
    // 'other candidates'/...), so `classify()` returns null for it.
    const unfamiliarEmail = {
      id: 'm-unfamiliar',
      subject: 'Sobre tu candidatura',
      from: 'people@acme.com',
      body: 'Finalmente elegimos a otra persona para el puesto. Gracias por tu tiempo.',
      internalDate: String(Date.now() - 1000 * 60 * 60 * 24),
    };

    it('classifies an email the keyword cascade cannot and proposes its update', async () => {
      mockGetState.mockReturnValue({
        applications: [application],
        addApplication: mockAddApplication,
        updateApplication: mockUpdateApplication,
      });
      mockedClassifyEmails.mockResolvedValue(
        new Map([[0, { type: 'rejected', verdict: 'auto', confidence: 0.88 }]]),
      );
      mockedMatchEmailToApplication.mockResolvedValue({
        applicationId: 'app-1',
        verdict: 'auto',
        confidence: 0.9,
      });

      const preview = await scanEmails(new FakeEmailProvider([unfamiliarEmail]));

      expect(mockedClassifyEmails).toHaveBeenCalledTimes(1);
      expect(preview.proposedAdditions).toHaveLength(0);
      expect(preview.proposedUpdates).toHaveLength(1);
      expect(preview.proposedUpdates[0].applicationId).toBe('app-1');
      expect(preview.proposedUpdates[0].newEvent.type).toBe('rejected');
    });

    it('skips an email the judgment calls unrelated', async () => {
      mockGetState.mockReturnValue({
        applications: [application],
        addApplication: mockAddApplication,
        updateApplication: mockUpdateApplication,
      });
      mockedClassifyEmails.mockResolvedValue(
        new Map([[0, { type: 'other', verdict: 'auto', confidence: 0.93 }]]),
      );

      const preview = await scanEmails(new FakeEmailProvider([unfamiliarEmail]));

      expect(preview.proposedAdditions).toHaveLength(0);
      expect(preview.proposedUpdates).toHaveLength(0);
      expect(mockedMatchEmailToApplication).not.toHaveBeenCalled();
    });

    it('keeps the keyword behaviour when the judgment is unavailable', async () => {
      mockGetState.mockReturnValue({
        applications: [application],
        addApplication: mockAddApplication,
        updateApplication: mockUpdateApplication,
      });

      const preview = await scanEmails(
        new FakeEmailProvider([
          {
            id: 'm-keyword-interview',
            subject: 'Interview invitation for Senior Engineer at Acme',
            from: 'recruiter@acme.com',
            body: 'We would like to schedule an interview next week.',
            internalDate: String(Date.now() - 1000 * 60 * 60 * 24),
          },
        ]),
      );

      // 'Interview invitation ... at Acme' matches the keyword cascade and the
      // company map, so the update is proposed without any judgment call.
      expect(preview.proposedUpdates).toHaveLength(1);
      expect(preview.proposedUpdates[0].applicationId).toBe('app-1');
      expect(mockedMatchEmailToApplication).not.toHaveBeenCalled();
    });
  });
});
