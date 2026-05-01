import { describe, it, expect } from 'vitest';
import { EmailAdapter } from './emailAdapter';
import type { Email, Event } from '../types';
import type { JobApplication } from '../../types/applications';

describe('EmailAdapter', () => {
  const adapter = new EmailAdapter();

  // ─── Helper ───────────────────────────────────────────────────────────────
  const makeEmail = (overrides: Partial<Email> & Pick<Email, 'id'>): Email => ({
    subject: '',
    from: '',
    body: '',
    date: '2025-01-15T10:00:00.000Z',
    ...overrides,
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // classify — basic 4 types (existing coverage preserved)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('classify', () => {
    describe('application_submitted', () => {
      it('classifies from subject "applied"', () => {
        const email = makeEmail({
          id: '1',
          subject: 'Re: Engineer at Acme',
          from: 'hr@acme.com',
          body: 'Thank you for applying. We received your application.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.type).toBe('application_submitted');
        expect(event!.date).toBe(email.date);
      });

      it('classifies from body "thank you for applying"', () => {
        const email = makeEmail({
          id: '2',
          subject: 'Your application',
          from: 'noreply@company.com',
          body: 'Thank you for applying to our company.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.type).toBe('application_submitted');
      });

      it('classifies from subject "application received"', () => {
        const email = makeEmail({
          id: '3',
          subject: 'Application received - Software Engineer',
          from: 'careers@acme.com',
          body: 'We got your application.',
        });
        expect(adapter.classify(email)?.type).toBe('application_submitted');
      });

      it('classifies from body "we have received your application"', () => {
        const email = makeEmail({
          id: '4',
          subject: 'Status update',
          from: 'hr@co.com',
          body: 'We have received your application and will review it shortly.',
        });
        expect(adapter.classify(email)?.type).toBe('application_submitted');
      });

      it('classifies from body "your candidacy has been received"', () => {
        const email = makeEmail({
          id: '5',
          subject: 'Update',
          from: 'hr@co.com',
          body: 'Your candidacy has been received. Thank you.',
        });
        expect(adapter.classify(email)?.type).toBe('application_submitted');
      });

      it('classifies from body "application for the role"', () => {
        const email = makeEmail({
          id: '6',
          subject: 'Hello',
          from: 'hr@co.com',
          body: 'Your application for the role has been noted.',
        });
        expect(adapter.classify(email)?.type).toBe('application_submitted');
      });

      it('classifies from body "your job application"', () => {
        const email = makeEmail({
          id: '7',
          subject: 'Info',
          from: 'hr@co.com',
          body: 'Your job application is being reviewed.',
        });
        expect(adapter.classify(email)?.type).toBe('application_submitted');
      });

      it('classifies from body "application status" + "received"', () => {
        const email = makeEmail({
          id: '8',
          subject: 'Info',
          from: 'hr@co.com',
          body: 'Your application status: received. We will be in touch.',
        });
        expect(adapter.classify(email)?.type).toBe('application_submitted');
      });

      it('classifies from body "candidature received"', () => {
        const email = makeEmail({
          id: '9',
          subject: 'Info',
          from: 'hr@co.com',
          body: 'Candidature received. We thank you for your interest.',
        });
        expect(adapter.classify(email)?.type).toBe('application_submitted');
      });
    });

    describe('rejected', () => {
      it('classifies from subject "regret"', () => {
        const email = makeEmail({
          id: '10',
          subject: 'We regret to inform you',
          from: 'noreply@company.com',
          body: 'Unfortunately we are not moving forward.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.type).toBe('rejected');
      });

      it('classifies from subject "unfortunately"', () => {
        const email = makeEmail({
          id: '11',
          subject: 'Unfortunately, we are unable to proceed',
          from: 'hr@co.com',
          body: 'We considered your application carefully.',
        });
        expect(adapter.classify(email)?.type).toBe('rejected');
      });

      it('classifies from subject "not moving forward"', () => {
        const email = makeEmail({
          id: '12',
          subject: 'Not moving forward with your application',
          from: 'hr@co.com',
          body: 'Thank you for your interest.',
        });
        expect(adapter.classify(email)?.type).toBe('rejected');
      });

      it('classifies from body "decided to move forward with other candidates"', () => {
        const email = makeEmail({
          id: '13',
          subject: 'Update',
          from: 'hr@co.com',
          body: "We've decided to move forward with other candidates for this position.",
        });
        expect(adapter.classify(email)?.type).toBe('rejected');
      });

      it('classifies from body "we have chosen another candidate"', () => {
        const email = makeEmail({
          id: '14',
          subject: 'Update',
          from: 'hr@co.com',
          body: 'We have chosen another candidate for the role.',
        });
        expect(adapter.classify(email)?.type).toBe('rejected');
      });

      it('classifies from body "position has been filled"', () => {
        const email = makeEmail({
          id: '15',
          subject: 'Update',
          from: 'hr@co.com',
          body: 'The position has been filled. Thank you for applying.',
        });
        expect(adapter.classify(email)?.type).toBe('rejected');
      });

      it('classifies from body "another applicant was selected"', () => {
        const email = makeEmail({
          id: '16',
          subject: 'Update',
          from: 'hr@co.com',
          body: 'Another applicant was selected for the role.',
        });
        expect(adapter.classify(email)?.type).toBe('rejected');
      });

      it('classifies from body "proceed with other candidates"', () => {
        const email = makeEmail({
          id: '17',
          subject: 'Update',
          from: 'hr@co.com',
          body: 'We will proceed with other candidates at this time.',
        });
        expect(adapter.classify(email)?.type).toBe('rejected');
      });

      it('classifies from body "we have filled this position"', () => {
        const email = makeEmail({
          id: '18',
          subject: 'Update',
          from: 'hr@co.com',
          body: 'We have filled this position. Good luck in your search.',
        });
        expect(adapter.classify(email)?.type).toBe('rejected');
      });

      it('classifies from body "qualifications align"', () => {
        const email = makeEmail({
          id: '19',
          subject: 'Update',
          from: 'hr@co.com',
          body: 'We will be in touch if your qualifications align with the needs of this role.',
        });
        expect(adapter.classify(email)?.type).toBe('rejected');
      });

      it('classifies from body "we wish you all the best"', () => {
        const email = makeEmail({
          id: '20',
          subject: 'Update',
          from: 'hr@co.com',
          body: 'We wish you all the best in your career search!',
        });
        expect(adapter.classify(email)?.type).toBe('rejected');
      });

      it('classifies from body "filled this role"', () => {
        const email = makeEmail({
          id: '21',
          subject: 'Update',
          from: 'hr@co.com',
          body: 'We have filled this role. Thank you.',
        });
        expect(adapter.classify(email)?.type).toBe('rejected');
      });
    });

    describe('next_steps', () => {
      it('classifies from subject "interview"', () => {
        const email = makeEmail({
          id: '22',
          subject: 'Next steps - interview schedule',
          from: 'recruiter@co.com',
          body: 'We would like to schedule a call.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.type).toBe('next_steps');
      });

      it('classifies from body "would like to schedule"', () => {
        const email = makeEmail({
          id: '23',
          subject: 'Update',
          from: 'recruiter@co.com',
          body: 'We would like to schedule an interview with you.',
        });
        expect(adapter.classify(email)?.type).toBe('next_steps');
      });

      it('classifies from body "technical assessment"', () => {
        const email = makeEmail({
          id: '24',
          subject: 'Update',
          from: 'recruiter@co.com',
          body: 'We would like to invite you to a technical assessment.',
        });
        expect(adapter.classify(email)?.type).toBe('next_steps');
      });

      it('classifies from body "calendly"', () => {
        const email = makeEmail({
          id: '25',
          subject: 'Update',
          from: 'recruiter@co.com',
          body: 'Please book a time on our Calendly link.',
        });
        expect(adapter.classify(email)?.type).toBe('next_steps');
      });

      it('classifies from body "book a time"', () => {
        const email = makeEmail({
          id: '26',
          subject: 'Update',
          from: 'recruiter@co.com',
          body: 'Please book a time for your interview.',
        });
        expect(adapter.classify(email)?.type).toBe('next_steps');
      });

      it('classifies from body "video interview"', () => {
        const email = makeEmail({
          id: '27',
          subject: 'Update',
          from: 'recruiter@co.com',
          body: 'We would like to invite you to a video interview.',
        });
        expect(adapter.classify(email)?.type).toBe('next_steps');
      });

      it('classifies from body "phone screen"', () => {
        const email = makeEmail({
          id: '28',
          subject: 'Update',
          from: 'recruiter@co.com',
          body: 'We would like to set up a phone screen.',
        });
        expect(adapter.classify(email)?.type).toBe('next_steps');
      });

      it('classifies from body "interview with the team"', () => {
        const email = makeEmail({
          id: '29',
          subject: 'Update',
          from: 'recruiter@co.com',
          body: 'We would like to invite you for an interview with the team.',
        });
        expect(adapter.classify(email)?.type).toBe('next_steps');
      });

      it('classifies from subject "invitation"', () => {
        const email = makeEmail({
          id: '30',
          subject: 'Invitation to interview',
          from: 'recruiter@co.com',
          body: 'Please let us know your availability.',
        });
        expect(adapter.classify(email)?.type).toBe('next_steps');
      });

      it('classifies from body "hiring manager review"', () => {
        const email = makeEmail({
          id: '31',
          subject: 'Update',
          from: 'recruiter@co.com',
          body: 'Your application is now in the hiring manager review stage.',
        });
        expect(adapter.classify(email)?.type).toBe('next_steps');
      });

      it('classifies from body "panel interview"', () => {
        const email = makeEmail({
          id: '32',
          subject: 'Update',
          from: 'recruiter@co.com',
          body: 'We would like to schedule a panel interview.',
        });
        expect(adapter.classify(email)?.type).toBe('next_steps');
      });
    });

    describe('offer', () => {
      it('classifies from subject "offer"', () => {
        const email = makeEmail({
          id: '33',
          subject: 'Job offer - Acme Corp',
          from: 'hr@acme.com',
          body: 'We are pleased to offer you the position.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.type).toBe('offer');
      });

      it('classifies from subject "congratulations"', () => {
        const email = makeEmail({
          id: '34',
          subject: 'Congratulations!',
          from: 'hr@acme.com',
          body: 'We are excited to offer you the role.',
        });
        expect(adapter.classify(email)?.type).toBe('offer');
      });

      it('classifies from body "offer of employment"', () => {
        const email = makeEmail({
          id: '35',
          subject: 'Important update',
          from: 'hr@acme.com',
          body: 'We are pleased to extend an offer of employment to you.',
        });
        expect(adapter.classify(email)?.type).toBe('offer');
      });

      it('classifies from body "excited to extend an offer"', () => {
        const email = makeEmail({
          id: '36',
          subject: 'Update',
          from: 'hr@acme.com',
          body: 'We are excited to extend an offer for the position.',
        });
        expect(adapter.classify(email)?.type).toBe('offer');
      });
    });

    describe('unrelated emails', () => {
      it('returns null for unrelated email', () => {
        const email = makeEmail({
          id: '37',
          subject: 'Your invoice',
          from: 'billing@other.com',
          body: 'Please pay by Friday.',
        });
        expect(adapter.classify(email)).toBeNull();
      });

      it('returns null for newsletter', () => {
        const email = makeEmail({
          id: '38',
          subject: 'Weekly digest',
          from: 'news@co.com',
          body: 'Here are this week\'s top stories.',
        });
        expect(adapter.classify(email)).toBeNull();
      });

      it('returns null for marketing email', () => {
        const email = makeEmail({
          id: '39',
          subject: 'Special discount just for you',
          from: 'promo@shop.com',
          body: 'Get 50% off this weekend only!',
        });
        expect(adapter.classify(email)).toBeNull();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Company extraction (tested via classify result)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('extractCompany', () => {
    describe('structured subject: "Company - Position"', () => {
      it('extracts company from "ClearGov - Sr. Software Engineer (Budgeting)"', () => {
        const email = makeEmail({
          id: 'tc-002',
          subject: 'ClearGov - Sr. Software Engineer (Budgeting)',
          from: 'ClearGov <recruiting+416977791@applytojob.com>',
          body: 'We regret to inform you that we are moving forward with other candidates for the Sr. Software Engineer (Budgeting) opportunity.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.company).toBe('ClearGov');
      });

      it('extracts company from "Acme Corp | Software Engineer"', () => {
        const email = makeEmail({
          id: 'pipe-subject',
          subject: 'Acme Corp | Software Engineer',
          from: 'hr@acme.com',
          body: 'Thank you for applying.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.company).toBe('Acme Corp');
      });

      it('extracts company from "TechCo — Developer" (em dash)', () => {
        const email = makeEmail({
          id: 'em-dash',
          subject: 'TechCo — Developer',
          from: 'hr@techco.com',
          body: 'Thank you for applying.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.company).toBe('TechCo');
      });

      it('extracts company from "Startup.io - Frontend Engineer"', () => {
        const email = makeEmail({
          id: 'dot-io',
          subject: 'Startup.io - Frontend Engineer',
          from: 'careers@startup.io',
          body: 'We received your application.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.company).toBe('Startup.io');
      });
    });

    describe('body patterns', () => {
      it('extracts company from "thank you for applying to [Company]"', () => {
        const email = makeEmail({
          id: 'body-thank',
          subject: 'Application update',
          from: 'hr@wygo.world',
          body: 'Thanks for taking the time to apply to the Software Engineer role at Wygo. We received your application.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.company).toBe('Wygo');
      });

      it('does NOT extract position title as company when applying to "the [Position] role"', () => {
        const email = makeEmail({
          id: 'no-title-as-company',
          subject: 'Application received',
          from: 'noreply@co.com',
          body: 'Thank you for applying to the Software Engineer role at Acme Corp. We have received your application.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        // Should NOT extract "Software Engineer" as company — should get "Acme Corp" from pattern 5
        expect(event!.company).not.toBe('Software Engineer');
        expect(event!.company).toBe('Acme Corp');
      });

      it('extracts company from "applying to [Company]"', () => {
        const email = makeEmail({
          id: 'body-applying',
          subject: 'Update',
          from: 'noreply@co.com',
          body: 'Thank you for applying to Acme Corp for the Engineer position.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.company).toBe('Acme Corp');
      });

      it('extracts company from "interest in joining [Company]"', () => {
        const email = makeEmail({
          id: 'body-interest',
          subject: 'Application received',
          from: 'noreply@co.com',
          body: 'Thank you for your interest in joining BigCorp for the Developer role. We have received your application.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.company).toBe('BigCorp');
      });

      it('extracts company from "Welcome to [Company]"', () => {
        const email = makeEmail({
          id: 'body-welcome',
          subject: 'Welcome!',
          from: 'hr@newco.com',
          body: 'Welcome to NewCo. We are excited to extend an offer of employment.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.company).toBe('NewCo');
      });

      it('extracts company from "Welcome to the [Company] team"', () => {
        const email = makeEmail({
          id: 'body-welcome-team',
          subject: 'Welcome!',
          from: 'hr@acme.com',
          body: 'Welcome to the Acme Corp team! We are excited to extend an offer.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.company).toBe('Acme Corp');
      });

      it('extracts company from "role at [Company]" after position mention', () => {
        const email = makeEmail({
          id: 'body-at',
          subject: 'Application update',
          from: 'noreply@co.com',
          body: 'Thank you for applying for the Engineer role at Acme. We appreciate your interest.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        // Pattern 5 extracts company after "role at"
        expect(event!.company).toBe('Acme');
      });
    });

    describe('from header patterns', () => {
      it('extracts company from "Company Name via Greenhouse"', () => {
        const email = makeEmail({
          id: 'via-greenhouse',
          subject: 'Application received',
          from: 'Acme Corp via Greenhouse <notifications@greenhouse.io>',
          body: 'We have received your application.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.company).toBe('Acme Corp');
      });

      it('extracts company from "Company via Lever"', () => {
        const email = makeEmail({
          id: 'via-lever',
          subject: 'Application received',
          from: 'TechCo via Lever <no-reply@lever.co>',
          body: 'We have received your application.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.company).toBe('TechCo');
      });

      it('extracts company from "CompanyName <hr@companyname.com>"', () => {
        const email = makeEmail({
          id: 'from-header',
          subject: 'Thank you for applying',
          from: 'BigCorp <hr@bigcorp.com>',
          body: 'We received your application.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.company).toBe('BigCorp');
      });

      it('extracts company from "Company Recruiting <recruiting@company.com>"', () => {
        const email = makeEmail({
          id: 'recruiting-suffix',
          subject: 'Application update - Software Engineer',
          from: 'Wygo Recruiting <notifications@notifications.wygo.world>',
          body: "Thanks for taking the time to apply to the Software Engineer role at Wygo. We're writing to let you know that we'll be moving forward with other candidates at this time.",
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        // Should extract "Wygo" from either from header or body
        expect(event!.company).toBe('Wygo');
      });

      it('extracts company from ATS email domain with applytojob.com', () => {
        const email = makeEmail({
          id: 'ats-domain',
          subject: 'Application received',
          from: 'ClearGov <recruiting+123@applytojob.com>',
          body: 'We have received your application.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        // "ClearGov" is in the from display name, and applytojob.com is excluded from domain fallback
        expect(event!.company).toBe('ClearGov');
      });
    });

    describe('domain fallback', () => {
      it('extracts company from generic sender email domain', () => {
        const email = makeEmail({
          id: 'domain-fallback',
          subject: 'Thank you for applying',
          from: 'noreply <jobs@acmecorp.com>',
          body: 'We received your application.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        // Should fall back to domain "acmecorp" and capitalize
        expect(event!.company).toBe('Acmecorp');
      });

      it('does not use ATS domain as company', () => {
        const email = makeEmail({
          id: 'no-ats-domain',
          subject: 'Thank you for applying',
          from: 'NoReply <noreply@greenhouse.io>',
          body: 'We received your application.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        // Should NOT return "Greenhouse" as company
        expect(event!.company?.toLowerCase()).not.toBe('greenhouse');
      });
    });

    describe('cleanCompanyName', () => {
      it('strips "Recruiting" suffix', () => {
        const email = makeEmail({
          id: 'clean-recruiting',
          subject: 'Application update',
          from: 'noreply@co.com',
          body: 'Thank you for applying to Acme Recruiting.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        // "Acme Recruiting" → "Acme" after cleanCompanyName strips Recruiting suffix
        expect(event!.company).toBe('Acme');
      });

      it('capitalizes lowercase company names from domain fallback', () => {
        const email = makeEmail({
          id: 'capitalize',
          subject: 'Thank you for applying',
          from: 'noreply <jobs@techstartup.com>',
          body: 'We received your application.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        // Domain "techstartup" should be capitalized to "Techstartup"
        expect(event!.company).toBe('Techstartup');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Position extraction (tested via classify result)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('extractPosition', () => {
    describe('structured subject: "Company - Position"', () => {
      it('extracts position from "ClearGov - Sr. Software Engineer (Budgeting)"', () => {
        const email = makeEmail({
          id: 'tc002-pos',
          subject: 'ClearGov - Sr. Software Engineer (Budgeting)',
          from: 'ClearGov <recruiting@applytojob.com>',
          body: 'We regret to inform you.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.position).toBe('Sr. Software Engineer');
      });

      it('extracts position from "Acme Corp - Software Engineer"', () => {
        const email = makeEmail({
          id: 'struct-pos',
          subject: 'Acme Corp - Software Engineer',
          from: 'hr@acme.com',
          body: 'Thank you for applying.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.position).toBe('Software Engineer');
      });

      it('extracts position from "TechCo | Senior Developer"', () => {
        const email = makeEmail({
          id: 'pipe-pos',
          subject: 'TechCo | Senior Developer',
          from: 'hr@techco.com',
          body: 'Thank you for applying.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.position).toBe('Senior Developer');
      });

      it('extracts position from "Company - Ruby/Rails Developer - Fort Lauderdale,Fl"', () => {
        const email = makeEmail({
          id: 'multi-segment',
          subject: 'Kovasys - Ruby/Rails Developer - Fort Lauderdale,Fl',
          from: 'jobs@kovasys.ca',
          body: 'Unfortunately we are moving forward with other candidates. Thank you for your interest.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        // Should extract position and strip location suffix
        expect(event!.position).toBe('Ruby/Rails Developer');
      });
    });

    describe('body patterns', () => {
      it('extracts position from "position of [Position]"', () => {
        const email = makeEmail({
          id: 'body-position-of',
          subject: 'Update',
          from: 'jobs@kovasys.ca',
          body: 'Thank you for applying for the position of Ruby/Rails Developer - Fort Lauderdale,Fl. We will be in touch.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.position).toBe('Ruby/Rails Developer');
      });

      it('extracts position from "role of [Position]"', () => {
        const email = makeEmail({
          id: 'body-role-of',
          subject: 'Update',
          from: 'hr@co.com',
          body: 'Unfortunately we are moving forward with other candidates. You were considered for the role of Senior Software Engineer at our company.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.position).toBe('Senior Software Engineer');
      });

      it('extracts position from "for the [Position] role"', () => {
        const email = makeEmail({
          id: 'body-for-role',
          subject: 'Update',
          from: 'hr@co.com',
          body: 'Thank you for applying for the Software Engineer role at Acme.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.position).toBe('Software Engineer');
      });

      it('extracts position from "for the [Position] position"', () => {
        const email = makeEmail({
          id: 'body-for-position',
          subject: 'Update',
          from: 'hr@co.com',
          body: 'Thank you for applying for the Senior Developer position at BigCorp.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        // Pattern 5 captures position before "position" keyword
        expect(event!.position).toBe('Senior Developer');
      });

      it('extracts position from title-ending patterns (Engineer, Developer, etc.)', () => {
        const email = makeEmail({
          id: 'body-title-end',
          subject: 'Update',
          from: 'hr@co.com',
          body: 'Thank you for applying. You applied as Senior Software Engineer at Acme Corp.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        // Pattern 6 matches title-ending words like "Engineer" after "as"
        expect(event!.position).toContain('Software Engineer');
      });

      it('extracts position from "job title:" label', () => {
        const email = makeEmail({
          id: 'body-job-title',
          subject: 'Update',
          from: 'hr@co.com',
          body: 'We received your application. Job title: Product Manager\nDepartment: Product',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.position).toBe('Product Manager');
      });

      it('extracts position from "Job title" without colon (pattern 4b)', () => {
        const email = makeEmail({
          id: 'body-job-title-no-colon',
          subject: 'Update',
          from: 'hr@co.com',
          body: 'We received your application. Job title Product Manager\nDepartment: Product',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.position).toBe('Product Manager');
      });

      it('extracts position from "Job title :" with space before colon (pattern 4)', () => {
        const email = makeEmail({
          id: 'body-job-title-space-colon',
          subject: 'Update',
          from: 'hr@co.com',
          body: 'We received your application. Job title : Product Manager\nDepartment: Product',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.position).toBe('Product Manager');
      });
    });

    describe('cleanPosition — parenthetical and location stripping', () => {
      it('strips (Remote) from position', () => {
        const email = makeEmail({
          id: 'strip-remote',
          subject: 'Acme - Software Engineer (Remote)',
          from: 'hr@acme.com',
          body: 'Thank you for applying.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.position).toBe('Software Engineer');
      });

      it('strips (Hybrid) from position', () => {
        const email = makeEmail({
          id: 'strip-hybrid',
          subject: 'Acme - Product Manager (Hybrid)',
          from: 'hr@acme.com',
          body: 'Thank you for applying.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.position).toBe('Product Manager');
      });

      it('strips (Budgeting) from position', () => {
        const email = makeEmail({
          id: 'strip-budgeting',
          subject: 'ClearGov - Sr. Software Engineer (Budgeting)',
          from: 'ClearGov <recruiting@applytojob.com>',
          body: 'We regret to inform you.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.position).toBe('Sr. Software Engineer');
      });

      it('strips (On-site) from position', () => {
        const email = makeEmail({
          id: 'strip-onsite',
          subject: 'Acme - Data Analyst (On-site)',
          from: 'hr@acme.com',
          body: 'Thank you for applying.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.position).toBe('Data Analyst');
      });

      it('strips location suffix "- Fort Lauderdale" from position', () => {
        const email = makeEmail({
          id: 'strip-location',
          subject: 'Kovasys - Ruby/Rails Developer - Fort Lauderdale,Fl',
          from: 'jobs@kovasys.ca',
          body: 'Unfortunately we are moving forward with other candidates. Thank you for your interest.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.position).toBe('Ruby/Rails Developer');
      });

      it('strips " - Remote" suffix from position', () => {
        const email = makeEmail({
          id: 'strip-remote-suffix',
          subject: 'Acme - Software Engineer - Remote',
          from: 'hr@acme.com',
          body: 'Thank you for applying.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.position).toBe('Software Engineer');
      });

      it('strips Full-time from position', () => {
        const email = makeEmail({
          id: 'strip-ft',
          subject: 'Acme - Software Engineer Full-time',
          from: 'hr@acme.com',
          body: 'Thank you for applying.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.position).toBe('Software Engineer');
      });

      it('strips location with mixed-case state code "Fort Lauderdale,Fl"', () => {
        const email = makeEmail({
          id: 'strip-state-code',
          subject: 'Acme - DevOps Engineer - Fort Lauderdale,Fl',
          from: 'hr@acme.com',
          body: 'Unfortunately we are moving forward with other candidates.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.position).toBe('DevOps Engineer');
      });

      it('strips [Remote] bracket notation', () => {
        const email = makeEmail({
          id: 'strip-bracket',
          subject: 'Acme - DevOps Engineer [Remote]',
          from: 'hr@acme.com',
          body: 'Thank you for applying.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.position).toBe('DevOps Engineer');
      });
    });

    describe('subject fallback patterns', () => {
      it('extracts position after "for" in subject (fallback)', () => {
        const email = makeEmail({
          id: 'for-fallback',
          subject: 'Thank you for Software Engineer',
          from: 'hr@acme.com',
          body: 'We have received your application.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.position).toBe('Software Engineer');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Real email test cases from spec
  // ═══════════════════════════════════════════════════════════════════════════
  describe('real email test cases', () => {
    it('TC-001: Wygo rejection — structured subject + ATS branding', () => {
      const email = makeEmail({
        id: 'tc-001',
        subject: 'Application update - Software Engineer',
        from: 'Wygo <notifications@notifications.wygo.world>',
        body: `Thanks for taking the time to apply to the Software Engineer role at Wygo. There are a ton of great companies out there, so we appreciate your interest in joining our team.

We're writing to let you know that we'll be moving forward with other candidates at this time.

That being said – there are a ton of ways we'd like to invite you to stay connected as we build out the broader Wygo community:

Thank you again for applying to this role, we genuinely hope to stay connected as Wygo continues to grow.

- Wygo Team`,
      });
      const event = adapter.classify(email);
      expect(event).not.toBeNull();
      expect(event!.type).toBe('rejected');
      expect(event!.company).toBe('Wygo');
      expect(event!.position).toBe('Software Engineer');
    });

    it('TC-002: ClearGov rejection — ATS via applytojob.com', () => {
      const email = makeEmail({
        id: 'tc-002',
        subject: 'ClearGov - Sr. Software Engineer (Budgeting)',
        from: 'ClearGov <recruiting+416977791-df3862ec@applytojob.com>',
        body: `Hello Diego,

We regret to inform you that we are moving forward with other candidates for the Sr. Software Engineer (Budgeting) opportunity. However, we will retain your resume and if a position opens that closely matches your skill set, we will contact you at that time. Please feel free to reapply to ClearGov in the future. Thanks again for your interest in employment at ClearGov!

We wish you all the best in your career search!
With gratitude,
ClearGov`,
      });
      const event = adapter.classify(email);
      expect(event).not.toBeNull();
      expect(event!.type).toBe('rejected');
      expect(event!.company).toBe('ClearGov');
      expect(event!.position).toBe('Sr. Software Engineer');
    });

    it('TC-003: Kovasys rejection — bilingual EN/FR, location in position', () => {
      const email = makeEmail({
        id: 'tc-003',
        subject: 'Ruby/Rails Developer - Fort Lauderdale,Fl',
        from: 'Kovasys IT Recruitment <jobs@kovasys.ca>',
        body: `Good day / Bonjour Diego,

Thank you for your interest in Kovasys IT Recruitment and for taking the time to apply for the position of Ruby/Rails Developer - Fort Lauderdale,Fl. We appreciate your effort and enthusiasm. We will be in touch if your qualifications align with the needs of this role. We wish you the very best in your job search and future career endeavors.

Nous vous remercions de l'intérêt que vous portez à Kovasys IT Recruitment Inc. et d'avoir pris le temps de postuler au poste de Ruby/Rails Developer - Fort Lauderdale,Fl. Nous apprécions vos efforts et votre enthousiasme.

IT Headhunting & Recruiting | Chasseur de Tête en TI
888.568.2747 | https://kovasys.com`,
      });
      const event = adapter.classify(email);
      expect(event).not.toBeNull();
      expect(event!.type).toBe('rejected');
      expect(event!.company).toBe('Kovasys');
      expect(event!.position).toBe('Ruby/Rails Developer');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Bilingual / Spanish classification
  // ═══════════════════════════════════════════════════════════════════════════
  describe('bilingual and Spanish classification', () => {
    it('classifies bilingual EN/FR rejection (Kovasys pattern)', () => {
      const email = makeEmail({
        id: 'bilingual-rej',
        subject: 'Update on your application',
        from: 'jobs@recruiting.ca',
        body: "Nous vous remercions de l'intérêt que vous portez à notre compagnie. We will be in touch if your qualifications align with the needs of this role. We wish you all the best.",
      });
      const event = adapter.classify(email);
      expect(event).not.toBeNull();
      expect(event!.type).toBe('rejected');
    });

    it('classifies French rejection phrase in bilingual email', () => {
      const email = makeEmail({
        id: 'fr-rej',
        subject: 'Mise à jour de votre candidature',
        from: 'rh@entreprise.com',
        body: "Nous regrettons de vous informer que nous n'avons pas sélectionné votre profil pour ce poste. We regret to inform you.",
      });
      const event = adapter.classify(email);
      expect(event).not.toBeNull();
      expect(event!.type).toBe('rejected');
    });

    it('classifies bilingual EN/FR application_submitted', () => {
      const email = makeEmail({
        id: 'bilingual-app',
        subject: 'Confirmation de votre candidature',
        from: 'rh@co.com',
        body: "Nous avons bien reçu votre candidature. We have received your application. Thank you for your interest.",
      });
      const event = adapter.classify(email);
      expect(event).not.toBeNull();
      expect(event!.type).toBe('application_submitted');
    });

    // Spanish-only classification tests
    describe('Spanish rejection', () => {
      it('classifies from subject "lamentamos"', () => {
        const email = makeEmail({
          id: 'es-lamentamos',
          subject: 'Lamentamos informarle',
          from: 'rrhh@empresa.com',
          body: 'Lamentamos informarle que no hemos seleccionado tu perfil para este puesto.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.type).toBe('rejected');
      });

      it('classifies from body "no hemos seleccionado tu perfil"', () => {
        const email = makeEmail({
          id: 'es-no-perfil',
          subject: 'Actualización',
          from: 'rrhh@empresa.com',
          body: 'No hemos seleccionado tu perfil para esta posición.',
        });
        expect(adapter.classify(email)?.type).toBe('rejected');
      });

      it('classifies from body "no procederemos con tu candidatura"', () => {
        const email = makeEmail({
          id: 'es-no-proceder',
          subject: 'Actualización',
          from: 'rrhh@empresa.com',
          body: 'No procederemos con tu candidatura en esta ocasión.',
        });
        expect(adapter.classify(email)?.type).toBe('rejected');
      });

      it('classifies from body "hemos decidido continuar con otros candidatos"', () => {
        const email = makeEmail({
          id: 'es-otros-cand',
          subject: 'Actualización',
          from: 'rrhh@empresa.com',
          body: 'Hemos decidido continuar con otros candidatos para este puesto.',
        });
        expect(adapter.classify(email)?.type).toBe('rejected');
      });

      it('classifies from body "hemos cubierto la vacante"', () => {
        const email = makeEmail({
          id: 'es-vacante',
          subject: 'Actualización',
          from: 'rrhh@empresa.com',
          body: 'Hemos cubierto la vacante. Gracias por tu interés.',
        });
        expect(adapter.classify(email)?.type).toBe('rejected');
      });

      it('classifies from body "lamentamos informar"', () => {
        const email = makeEmail({
          id: 'es-lamentamos-body',
          subject: 'Actualización',
          from: 'rrhh@empresa.com',
          body: 'Lamentamos informar que otro candidato ha sido seleccionado.',
        });
        expect(adapter.classify(email)?.type).toBe('rejected');
      });
    });

    describe('Spanish application_submitted', () => {
      it('classifies from subject "solicitud recibida"', () => {
        const email = makeEmail({
          id: 'es-sol-recibida',
          subject: 'Solicitud recibida - Ingeniero de Software',
          from: 'rrhh@empresa.com',
          body: 'Hemos recibido tu solicitud.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.type).toBe('application_submitted');
      });

      it('classifies from body "hemos recibido tu candidatura"', () => {
        const email = makeEmail({
          id: 'es-hemos-recibido',
          subject: 'Confirmación',
          from: 'rrhh@empresa.com',
          body: 'Hemos recibido tu candidatura y la revisaremos pronto.',
        });
        expect(adapter.classify(email)?.type).toBe('application_submitted');
      });

      it('classifies from body "tu candidatura ha sido recibida"', () => {
        const email = makeEmail({
          id: 'es-cand-recibida',
          subject: 'Confirmación',
          from: 'rrhh@empresa.com',
          body: 'Tu candidatura ha sido recibida. Gracias por tu postulación.',
        });
        expect(adapter.classify(email)?.type).toBe('application_submitted');
      });

      it('classifies from body "gracias por tu postulación"', () => {
        const email = makeEmail({
          id: 'es-gracias-post',
          subject: 'Confirmación',
          from: 'rrhh@empresa.com',
          body: 'Gracias por tu postulación a nuestra empresa.',
        });
        expect(adapter.classify(email)?.type).toBe('application_submitted');
      });

      it('classifies from body "gracias por aplicar"', () => {
        const email = makeEmail({
          id: 'es-gracias-aplicar',
          subject: 'Confirmación',
          from: 'rrhh@empresa.com',
          body: 'Gracias por aplicar a esta posición.',
        });
        expect(adapter.classify(email)?.type).toBe('application_submitted');
      });
    });

    describe('Spanish next_steps', () => {
      it('classifies from subject "entrevista"', () => {
        const email = makeEmail({
          id: 'es-entrevista-subj',
          subject: 'Invitación a entrevista',
          from: 'rrhh@empresa.com',
          body: 'Te invitamos a entrevista con el equipo.',
        });
        expect(adapter.classify(email)?.type).toBe('next_steps');
      });

      it('classifies from body "te invitamos a entrevista"', () => {
        const email = makeEmail({
          id: 'es-inv-entrevista',
          subject: 'Actualización',
          from: 'rrhh@empresa.com',
          body: 'Te invitamos a entrevista para la posición de Ingeniero.',
        });
        expect(adapter.classify(email)?.type).toBe('next_steps');
      });

      it('classifies from body "prueba técnica"', () => {
        const email = makeEmail({
          id: 'es-prueba',
          subject: 'Actualización',
          from: 'rrhh@empresa.com',
          body: 'Te pedimos completar una prueba técnica como parte del proceso.',
        });
        expect(adapter.classify(email)?.type).toBe('next_steps');
      });

      it('classifies from subject "próximos pasos"', () => {
        const email = makeEmail({
          id: 'es-prox-pasos',
          subject: 'Próximos pasos en tu aplicación',
          from: 'rrhh@empresa.com',
          body: 'Nos gustaría agendar una entrevista contigo.',
        });
        expect(adapter.classify(email)?.type).toBe('next_steps');
      });
    });

    describe('Spanish offer', () => {
      it('classifies from subject "oferta de empleo"', () => {
        const email = makeEmail({
          id: 'es-oferta-subj',
          subject: 'Oferta de empleo - Ingeniero',
          from: 'rrhh@empresa.com',
          body: 'Nos complace ofrecerte esta posición.',
        });
        expect(adapter.classify(email)?.type).toBe('offer');
      });

      it('classifies from body "tenemos el gusto de ofrecerte"', () => {
        const email = makeEmail({
          id: 'es-oferta-body',
          subject: 'Actualización',
          from: 'rrhh@empresa.com',
          body: 'Tenemos el gusto de ofrecerte el puesto de Ingeniero de Software.',
        });
        expect(adapter.classify(email)?.type).toBe('offer');
      });

      it('classifies from subject "felicitaciones"', () => {
        const email = makeEmail({
          id: 'es-felicitaciones',
          subject: 'Felicitaciones',
          from: 'rrhh@empresa.com',
          body: 'Nos complace ofrecerte el puesto.',
        });
        expect(adapter.classify(email)?.type).toBe('offer');
      });
    });

    describe('Spanish company/position extraction', () => {
      it('extracts company and position from Spanish email with structured subject', () => {
        const email = makeEmail({
          id: 'es-extract-1',
          subject: 'Empresa Corp - Ingeniero de Software',
          from: 'rrhh@empresacorp.com',
          body: 'Hemos recibido tu candidatura para este puesto.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.type).toBe('application_submitted');
        expect(event!.company).toBe('Empresa Corp');
        expect(event!.position).toBe('Ingeniero de Software');
      });

      it('extracts company from Spanish "role at [Company]" body pattern', () => {
        const email = makeEmail({
          id: 'es-extract-2',
          subject: 'Actualización',
          from: 'rrhh@empresa.com',
          body: 'Lamentamos informar que no hemos seleccionado tu perfil para el puesto de Ingeniero de Software en Empresa Corp.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.type).toBe('rejected');
        // Company from from header domain fallback
        expect(event!.company).toBe('Empresa');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Salary extraction from offer emails
  // ═══════════════════════════════════════════════════════════════════════════
  describe('extractSalary', () => {
    describe('explicit annual salary keyword', () => {
      it('extracts from "annual salary: $120,000"', () => {
        const email = makeEmail({
          id: 'sal-annual',
          subject: 'Job offer',
          from: 'hr@acme.com',
          body: 'We are pleased to offer you the position. Annual salary: $120,000. Start date is Monday.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.type).toBe('offer');
        expect(event!.salary).toBe('$120,000');
      });

      it('extracts from "salary: €80,000"', () => {
        const email = makeEmail({
          id: 'sal-euro',
          subject: 'Offer',
          from: 'hr@euroco.com',
          body: 'Congratulations! We are pleased to offer you the role. Salary: €80,000 per year.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.type).toBe('offer');
        expect(event!.salary).toContain('€80,000');
      });

      it('extracts from "compensation: $150,000"', () => {
        const email = makeEmail({
          id: 'sal-comp',
          subject: 'Offer',
          from: 'hr@co.com',
          body: 'We are excited to extend an offer. Compensation: $150,000.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.type).toBe('offer');
        expect(event!.salary).toBe('$150,000');
      });

      it('extracts from "base salary $95,000"', () => {
        const email = makeEmail({
          id: 'sal-base',
          subject: 'Offer',
          from: 'hr@co.com',
          body: 'We are excited to extend an offer for the position. Base salary $95,000.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.type).toBe('offer');
        expect(event!.salary).toBe('$95,000');
      });

      it('extracts from "offered compensation $110,000"', () => {
        const email = makeEmail({
          id: 'sal-offered',
          subject: 'Offer',
          from: 'hr@co.com',
          body: 'We are pleased to offer you the role. Offered compensation $110,000.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.type).toBe('offer');
        expect(event!.salary).toBe('$110,000');
      });
    });

    describe('per-year indicator', () => {
      it('extracts from "$120,000 per year"', () => {
        const email = makeEmail({
          id: 'sal-per-year',
          subject: 'Offer',
          from: 'hr@co.com',
          body: 'We are pleased to offer you the position. $120,000 per year.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.type).toBe('offer');
        expect(event!.salary).toBe('$120,000');
      });

      it('extracts from "$120,000 annually"', () => {
        const email = makeEmail({
          id: 'sal-annually',
          subject: 'Offer',
          from: 'hr@co.com',
          body: 'We are excited to extend an offer. $120,000 annually.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.type).toBe('offer');
        expect(event!.salary).toBe('$120,000');
      });

      it('extracts from "$120,000/yr"', () => {
        const email = makeEmail({
          id: 'sal-slash-yr',
          subject: 'Offer',
          from: 'hr@co.com',
          body: 'We are pleased to offer you the position. $120,000/yr.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.type).toBe('offer');
        expect(event!.salary).toBe('$120,000');
      });

      it('extracts from "$120,000 per annum"', () => {
        const email = makeEmail({
          id: 'sal-per-annum',
          subject: 'Offer',
          from: 'hr@co.com',
          body: 'We are pleased to offer you the position. $120,000 per annum.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.type).toBe('offer');
        expect(event!.salary).toBe('$120,000');
      });

      it('extracts from "£85,000 a year"', () => {
        const email = makeEmail({
          id: 'sal-gbp-year',
          subject: 'Offer',
          from: 'hr@ukco.com',
          body: 'We are excited to extend an offer. £85,000 a year.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.type).toBe('offer');
        expect(event!.salary).toContain('£85,000');
      });
    });

    describe('k-suffix salary', () => {
      it('extracts from "$120k" in offer context', () => {
        const email = makeEmail({
          id: 'sal-k-suffix',
          subject: 'Offer',
          from: 'hr@co.com',
          body: 'We are pleased to offer you the position. Salary of $120k.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.type).toBe('offer');
        expect(event!.salary).toBe('$120,000');
      });

      it('extracts from "$120K/year"', () => {
        const email = makeEmail({
          id: 'sal-k-year',
          subject: 'Offer',
          from: 'hr@co.com',
          body: 'We are pleased to offer you the position. $120K/year.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.type).toBe('offer');
        expect(event!.salary).toBe('$120,000');
      });

      it('extracts from "€80k per year"', () => {
        const email = makeEmail({
          id: 'sal-euro-k',
          subject: 'Offer',
          from: 'hr@euroco.com',
          body: 'We are excited to extend an offer. €80k per year.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.type).toBe('offer');
        expect(event!.salary).toContain('€80,000');
      });

      it('expands fractional k-suffix: "$1.5K" → "$1,500"', () => {
        const email = makeEmail({
          id: 'sal-frac-k',
          subject: 'Offer',
          from: 'hr@co.com',
          body: 'We are pleased to offer you a monthly bonus of $1.5K/year.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.type).toBe('offer');
        expect(event!.salary).toBe('$1,500');
      });
    });

    describe('k-suffix salary range', () => {
      it('extracts from "$100k - $120k"', () => {
        const email = makeEmail({
          id: 'sal-k-range',
          subject: 'Offer',
          from: 'hr@co.com',
          body: 'We are pleased to offer you the position. $100k - $120k.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.type).toBe('offer');
        expect(event!.salary).toBe('$100,000 - $120,000');
      });

      it('extracts from "$100K-$120K" (no spaces)', () => {
        const email = makeEmail({
          id: 'sal-k-range-ns',
          subject: 'Offer',
          from: 'hr@co.com',
          body: 'We are excited to extend an offer. $100K-$120K.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.type).toBe('offer');
        expect(event!.salary).toContain('100,000');
        expect(event!.salary).toContain('120,000');
      });
    });

    describe('full-number salary range', () => {
      it('extracts from "$100,000 - $120,000"', () => {
        const email = makeEmail({
          id: 'sal-full-range',
          subject: 'Offer',
          from: 'hr@co.com',
          body: 'We are pleased to offer you the position. $100,000 - $120,000.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.type).toBe('offer');
        expect(event!.salary).toBe('$100,000 - $120,000');
      });

      it('extracts from "€80,000 to €95,000"', () => {
        const email = makeEmail({
          id: 'sal-euro-range',
          subject: 'Offer',
          from: 'hr@euroco.com',
          body: 'We are pleased to offer you the role. €80,000 to €95,000.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.type).toBe('offer');
        expect(event!.salary).toContain('€80,000');
        expect(event!.salary).toContain('€95,000');
        expect(event!.salary).toContain(' - ');
      });
    });

    describe('salary near keyword', () => {
      it('extracts "$120,000" near "salary" (within 50 chars)', () => {
        const email = makeEmail({
          id: 'sal-near',
          subject: 'Offer',
          from: 'hr@co.com',
          body: 'We are excited to extend an offer. $120,000 is your starting salary.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.type).toBe('offer');
        expect(event!.salary).toContain('$120,000');
      });

      it('extracts "$120,000" when "compensation" follows', () => {
        const email = makeEmail({
          id: 'sal-near-comp',
          subject: 'Offer',
          from: 'hr@co.com',
          body: 'We are pleased to offer you the position. $120,000 compensation package.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.type).toBe('offer');
        expect(event!.salary).toContain('$120,000');
      });
    });

    describe('monthly salary (converted to annual)', () => {
      it('extracts and converts "$10,000/month" to annual', () => {
        const email = makeEmail({
          id: 'sal-monthly',
          subject: 'Offer',
          from: 'hr@co.com',
          body: 'We are pleased to offer you the position. $10,000/month.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.type).toBe('offer');
        expect(event!.salary).toContain('120,000');
        expect(event!.salary).toContain('(approx.)');
      });

      it('extracts and converts "€8,000 per month" to annual', () => {
        const email = makeEmail({
          id: 'sal-monthly-euro',
          subject: 'Offer',
          from: 'hr@euroco.com',
          body: 'We are excited to extend an offer. €8,000 per month.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.type).toBe('offer');
        expect(event!.salary).toContain('96,000');
        expect(event!.salary).toContain('(approx.)');
      });
    });

    describe('no salary extraction for non-offer emails', () => {
      it('does not extract salary from rejection email', () => {
        const email = makeEmail({
          id: 'no-sal-rej',
          subject: 'Update',
          from: 'hr@co.com',
          body: 'We regret to inform you that we are moving forward with other candidates. Your expected salary of $120,000 was noted.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.type).toBe('rejected');
        expect(event!.salary).toBeUndefined();
      });
    });

    describe('no salary in offer without recognizable pattern', () => {
      it('returns undefined salary when no salary pattern matches', () => {
        const email = makeEmail({
          id: 'sal-none',
          subject: 'Offer',
          from: 'hr@co.com',
          body: 'We are pleased to offer you the position. Please review the attached offer letter for details.',
        });
        const event = adapter.classify(email);
        expect(event).not.toBeNull();
        expect(event!.type).toBe('offer');
        // salary may be undefined or empty string
        expect(event!.salary).toBeFalsy();
      });
    });

    describe('applicationFromEvent with salary', () => {
      it('passes salary from offer event to application', () => {
        const event: Event = {
          id: 'ev-sal',
          type: 'offer',
          date: '2025-01-15T00:00:00.000Z',
          company: 'Acme',
          position: 'Engineer',
          salary: '$120,000',
          notes: 'Job offer',
        };
        const data = adapter.applicationFromEvent(event);
        expect(data.salary).toBe('$120,000');
        expect(data.status).toBe('Offer');
      });

      it('extracts salary from email when not in event', () => {
        const event: Event = {
          id: 'ev-sal-extract',
          type: 'offer',
          date: '2025-01-15T00:00:00.000Z',
          company: 'Acme',
          position: 'Engineer',
          notes: 'Job offer',
        };
        const email: Email = {
          id: 'email-sal',
          subject: 'Job offer',
          from: 'hr@acme.com',
          body: 'We are pleased to offer you the position. Salary: $130,000.',
          date: '2025-01-15T00:00:00.000Z',
        };
        const data = adapter.applicationFromEvent(event, email);
        expect(data.salary).toContain('$130,000');
      });

      it('leaves salary empty for non-offer event without email', () => {
        const event: Event = {
          id: 'ev-no-sal',
          type: 'application_submitted',
          date: '2025-01-15',
          company: 'Acme',
          position: 'Engineer',
          notes: '',
        };
        const data = adapter.applicationFromEvent(event);
        expect(data.salary).toBe('');
        expect(data.status).toBe('Applied');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HTML body parsing — tested indirectly through classify with HTML-like content
  // ═══════════════════════════════════════════════════════════════════════════
  describe('HTML-like body content', () => {
    it('classifies email with HTML entities in body', () => {
      const email = makeEmail({
        id: 'html-entities',
        subject: 'Application update',
        from: 'hr@acme.com',
        body: 'We regret to inform you that we are moving forward with other candidates for the Software Engineer role at Acme Corp. &nbsp; We wish you all the best.',
      });
      const event = adapter.classify(email);
      expect(event).not.toBeNull();
      expect(event!.type).toBe('rejected');
      expect(event!.company).toBe('Acme Corp');
    });

    it('classifies rejection with HTML tags stripped from body', () => {
      const email = makeEmail({
        id: 'html-tags',
        subject: 'Application update - Software Engineer',
        from: 'Wygo <notifications@notifications.wygo.world>',
        body: `Application update Software Engineer

Wygo Recruiting

Hello, Thanks for taking the time to apply to the Software Engineer role at Wygo. We're writing to let you know that we'll be moving forward with other candidates at this time.

Thank you again for applying to this role.

- Wygo Team`,
      });
      const event = adapter.classify(email);
      expect(event).not.toBeNull();
      expect(event!.type).toBe('rejected');
      expect(event!.company).toBe('Wygo');
      // Position extracted from structured subject "Application update - Software Engineer"
      expect(event!.position).toBe('Software Engineer');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // applicationFromEvent (preserved existing tests)
  // ═══════════════════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════════════════
  // eventToInterviewEvent (preserved existing tests)
  // ═══════════════════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════════════════
  // applyEventToApplication (preserved existing tests)
  // ═══════════════════════════════════════════════════════════════════════════
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
