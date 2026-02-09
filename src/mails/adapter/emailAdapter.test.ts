import { describe, it, expect } from 'vitest';
import { EmailAdapter } from './emailAdapter';
import type { Email, Event } from '../types';
import type { JobApplication } from '../../types/applications';

describe('EmailAdapter', () => {
  const adapter = new EmailAdapter();

  describe('classify', () => {
    it('classifies application_submitted from subject or body', () => {
      const email: Email = {
        id: '1',
        subject: 'Re: Engineer at Acme',
        from: 'hr@acme.com',
        body: 'Thank you for applying. We received your application.',
        date: '2025-01-15T10:00:00.000Z',
      };
      const event = adapter.classify(email);
      expect(event).not.toBeNull();
      expect(event!.type).toBe('application_submitted');
      expect(event!.company).toBeDefined();
      expect(event!.date).toBe(email.date);
    });

    it('classifies rejected from subject', () => {
      const email: Email = {
        id: '2',
        subject: 'We regret to inform you',
        from: 'noreply@company.com',
        body: 'Unfortunately we are not moving forward.',
        date: '2025-01-16T10:00:00.000Z',
      };
      const event = adapter.classify(email);
      expect(event).not.toBeNull();
      expect(event!.type).toBe('rejected');
    });

    it('classifies next_steps from subject', () => {
      const email: Email = {
        id: '3',
        subject: 'Next steps - interview schedule',
        from: 'recruiter@co.com',
        body: 'We would like to schedule a call.',
        date: '2025-01-17T10:00:00.000Z',
      };
      const event = adapter.classify(email);
      expect(event).not.toBeNull();
      expect(event!.type).toBe('next_steps');
    });

    it('classifies offer from subject or body', () => {
      const email: Email = {
        id: '4',
        subject: 'Job offer - Acme Corp',
        from: 'hr@acme.com',
        body: 'We are pleased to offer you the position.',
        date: '2025-01-18T10:00:00.000Z',
      };
      const event = adapter.classify(email);
      expect(event).not.toBeNull();
      expect(event!.type).toBe('offer');
    });

    it('returns null for unrelated email', () => {
      const email: Email = {
        id: '5',
        subject: 'Your invoice',
        from: 'billing@other.com',
        body: 'Please pay by Friday.',
        date: '2025-01-19T10:00:00.000Z',
      };
      expect(adapter.classify(email)).toBeNull();
    });
  });

  describe('applicationFromEvent', () => {
    it('builds application payload from application_submitted event', () => {
      const event: Event = {
        id: 'ev-1',
        type: 'application_submitted',
        date: '2025-01-15T00:00:00.000Z',
        company: 'acme',
        position: 'Engineer',
        notes: 'Thank you for applying',
      };
      const data = adapter.applicationFromEvent(event);
      expect(data.company).toBe('acme');
      expect(data.position).toBe('Engineer');
      expect(data.applicationDate).toBe('2025-01-15');
      expect(data.timeline).toHaveLength(1);
      expect(data.timeline[0].type).toBe('application_submitted');
      expect(data.platform).toBe('Email');
    });

    it('uses Unknown for missing company/position', () => {
      const event: Event = {
        id: 'ev-2',
        type: 'application_submitted',
        date: '2025-01-15',
        notes: '',
      };
      const data = adapter.applicationFromEvent(event);
      expect(data.company).toBe('Unknown');
      expect(data.position).toBe('Unknown');
    });
  });

  describe('eventToInterviewEvent', () => {
    it('maps next_steps to first_contact', () => {
      const event: Event = {
        id: 'ev-3',
        type: 'next_steps',
        date: '2025-01-17T12:00:00.000Z',
        notes: 'Interview invite',
      };
      const ie = adapter.eventToInterviewEvent(event);
      expect(ie.type).toBe('first_contact');
      expect(ie.date).toBe(event.date);
      expect(ie.status).toBe('completed');
    });

    it('keeps rejected and offer as-is', () => {
      expect(adapter.eventToInterviewEvent({ id: 'e', type: 'rejected', date: '2025-01-01' }).type).toBe('rejected');
      expect(adapter.eventToInterviewEvent({ id: 'e', type: 'offer', date: '2025-01-01' }).type).toBe('offer');
    });
  });

  describe('applyEventToApplication', () => {
    it('adds event to matching application by company', () => {
      const applications: JobApplication[] = [
        {
          id: 'app-1',
          position: 'Engineer',
          company: 'Acme',
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
        },
      ];
      const event: Event = {
        id: 'ev-up',
        type: 'rejected',
        date: '2025-01-20T10:00:00.000Z',
        company: 'acme',
        notes: 'Regret',
      };
      const result = adapter.applyEventToApplication(event, applications);
      expect(result).not.toBe(applications);
      expect(result).toHaveLength(1);
      expect(result[0].timeline).toHaveLength(1);
      expect(result[0].timeline[0].type).toBe('rejected');
    });

    it('returns same array when no application matches', () => {
      const applications: JobApplication[] = [
        { id: 'a', company: 'Other', position: 'X', salary: '', status: '', applicationDate: '', interviewDate: '', timeline: [], notes: '', link: '', platform: '', contactName: '', followUpDate: '' },
      ];
      const event: Event = { id: 'e', type: 'rejected', date: '2025-01-01', company: 'Acme' };
      const result = adapter.applyEventToApplication(event, applications);
      expect(result).toBe(applications);
      expect(result[0].timeline).toHaveLength(0);
    });
  });
});
