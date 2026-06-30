import { describe, it, expect } from 'vitest';

import {
  parseApplicationsSyncResponse,
  parseOpportunitiesSyncResponse,
  jobApplicationSchema,
  jobOpportunitySchema,
} from './syncSchemas';

const validApplication = {
  id: 'app_abc123',
  position: 'Senior Engineer',
  company: 'Acme Corp',
  location: 'Remote',
  workType: 'remote',
  hybridDaysInOffice: null,
  salary: '$120k',
  status: 'Applied',
  applicationDate: '2024-01-15',
  interviewDate: '',
  timeline: [
    {
      id: 'evt_1',
      type: 'application_submitted',
      date: '2024-01-15',
      status: 'completed',
    },
  ],
  notes: 'Initial application',
  link: 'https://example.com/jobs/123',
  platform: 'LinkedIn',
  contactName: 'Jane Recruiter',
  followUpDate: '',
};

const validOpportunity = {
  id: 'opp_xyz789',
  position: 'Staff Engineer',
  company: 'BigCo',
  link: 'https://example.com/jobs/456',
  description: 'Great role',
  location: 'Berlin',
  jobType: 'Remote',
  salary: '€90k',
  postedDate: '2024-01-10T10:00:00Z',
  capturedDate: '2024-01-12T10:00:00+00:00',
};

describe('parseApplicationsSyncResponse', () => {
  it('passes a fully valid application through unchanged', () => {
    const out = parseApplicationsSyncResponse({ success: true, applications: [validApplication] });
    expect(out.items).toHaveLength(1);
    expect(out.items[0].id).toBe('app_abc123');
    expect(out.envelopeError).toBeNull();
    expect(out.dropped).toBe(0);
  });

  it('sanitises javascript: link to #', () => {
    const malicious = { ...validApplication, link: 'javascript:alert(document.cookie)' };
    const out = parseApplicationsSyncResponse({ success: true, applications: [malicious] });
    expect(out.items[0].link).toBe('#');
  });

  it('sanitises data:text/html link to #', () => {
    const malicious = { ...validApplication, link: 'data:text/html,<script>alert(1)</script>' };
    const out = parseApplicationsSyncResponse({ success: true, applications: [malicious] });
    expect(out.items[0].link).toBe('#');
  });

  it('drops rows whose workType is not allowlisted', () => {
    const bad = { ...validApplication, workType: 'martian' };
    const out = parseApplicationsSyncResponse({ success: true, applications: [bad] });
    expect(out.items).toHaveLength(0);
    expect(out.dropped).toBe(1);
  });

  it('drops rows whose timeline event has an invalid type', () => {
    const bad = {
      ...validApplication,
      timeline: [
        { id: 'evt_1', type: 'made_up_stage', date: '2024-01-15', status: 'completed' },
      ],
    };
    const out = parseApplicationsSyncResponse({ success: true, applications: [bad] });
    expect(out.items).toHaveLength(0);
    expect(out.dropped).toBe(1);
  });

  it('caps applications at MAX_ENTITIES (1000) and reports truncation separately', () => {
    const overflow = Array.from({ length: 1500 }, (_, i) => ({
      ...validApplication,
      id: `app_${i}`,
    }));
    const out = parseApplicationsSyncResponse({ success: true, applications: overflow });
    expect(out.items).toHaveLength(1000);
    // Truncation is a DoS guard, not a validation failure: dropped stays 0.
    expect(out.dropped).toBe(0);
    expect(out.truncated).toBe(500);
  });

  it('keeps siblings when dropping a malformed row', () => {
    const bad = { ...validApplication, id: 'app_bad', position: 'x'.repeat(5000) }; // oversize
    const out = parseApplicationsSyncResponse({
      success: true,
      applications: [validApplication, bad, { ...validApplication, id: 'app_ok2' }],
    });
    expect(out.items.map((a) => a.id)).toEqual(['app_abc123', 'app_ok2']);
    expect(out.dropped).toBe(1);
  });

  it('returns envelopeError and empty items when success !== true', () => {
    const out = parseApplicationsSyncResponse({ success: false, applications: [validApplication] });
    expect(out.items).toHaveLength(0);
    expect(out.envelopeError).toMatch(/success/);
  });

  it('returns empty items but no envelopeError when applications is absent', () => {
    const out = parseApplicationsSyncResponse({ success: true });
    expect(out.items).toHaveLength(0);
    expect(out.envelopeError).toBeNull();
  });

  it('returns envelopeError on a non-object response', () => {
    expect(parseApplicationsSyncResponse(null).envelopeError).toMatch(/non-object/);
    expect(parseApplicationsSyncResponse('oops').envelopeError).toMatch(/non-object/);
    expect(parseApplicationsSyncResponse(42).envelopeError).toMatch(/non-object/);
  });

  it('drops rows whose id fails the regex (proto-pollution / path traversal)', () => {
    const bad = { ...validApplication, id: '../etc/passwd' };
    const out = parseApplicationsSyncResponse({ success: true, applications: [bad] });
    expect(out.items).toHaveLength(0);
    expect(out.dropped).toBe(1);
  });

  it('coerces null optional fields to undefined (matches JobApplication type)', () => {
    const apiStyle = {
      ...validApplication,
      location: null,
      workType: null,
      hybridDaysInOffice: null,
      notes: 'real notes',
    };
    const out = parseApplicationsSyncResponse({ success: true, applications: [apiStyle] });
    expect(out.items[0].location).toBeUndefined();
    expect(out.items[0].workType).toBeUndefined();
    expect(out.items[0].hybridDaysInOffice).toBeUndefined();
  });

  it('accepts empty applicationDate / interviewDate strings (legacy rows)', () => {
    const legacy = {
      ...validApplication,
      applicationDate: '',
      interviewDate: '',
    };
    const out = parseApplicationsSyncResponse({ success: true, applications: [legacy] });
    expect(out.items).toHaveLength(1);
    expect(out.items[0].applicationDate).toBe('');
    expect(out.items[0].interviewDate).toBe('');
  });

  it('accepts ids generated by utils/id.ts generateId()', () => {
    // Mirror generateId(): `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const generated = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const app = { ...validApplication, id: generated };
    const out = parseApplicationsSyncResponse({ success: true, applications: [app] });
    expect(out.items).toHaveLength(1);
    expect(out.items[0].id).toBe(generated);
  });
});

describe('parseOpportunitiesSyncResponse', () => {
  it('passes a fully valid opportunity through unchanged', () => {
    const out = parseOpportunitiesSyncResponse({ success: true, opportunities: [validOpportunity] });
    expect(out.items).toHaveLength(1);
    expect(out.items[0].id).toBe('opp_xyz789');
    expect(out.items[0].capturedDate).toBe('2024-01-12T10:00:00+00:00');
    expect(out.envelopeError).toBeNull();
  });

  it('sanitises javascript: link', () => {
    const bad = { ...validOpportunity, link: 'javascript:fetch("/steal")' };
    const out = parseOpportunitiesSyncResponse({ success: true, opportunities: [bad] });
    expect(out.items[0].link).toBe('#');
  });

  it('drops rows with malformed postedDate', () => {
    const bad = { ...validOpportunity, postedDate: 'yesterday' };
    const out = parseOpportunitiesSyncResponse({ success: true, opportunities: [bad] });
    expect(out.items).toHaveLength(0);
    expect(out.dropped).toBe(1);
  });
});

describe('schema direct — sanity', () => {
  it('jobApplicationSchema fails closed on a missing id', () => {
    // Build a copy of validApplication WITHOUT the id field, sidestepping
    // the noUnusedLocals + @typescript-eslint/no-unused-vars warnings that
    // a `const { id, ...rest } = ...` destructure would emit.
    const rest = Object.fromEntries(
      Object.entries(validApplication).filter(([k]) => k !== 'id'),
    );
    const r = jobApplicationSchema.safeParse(rest);
    expect(r.success).toBe(false);
  });

  it('jobOpportunitySchema accepts common ISO date variants', () => {
    expect(jobOpportunitySchema.safeParse({ ...validOpportunity, postedDate: '2024-01-15' }).success).toBe(true);
    expect(jobOpportunitySchema.safeParse({ ...validOpportunity, postedDate: '2024-01-15T10:00:00-05:00' }).success).toBe(true);
    expect(jobOpportunitySchema.safeParse({ ...validOpportunity, postedDate: '2024-01-15T10:00:00.123Z' }).success).toBe(true);
  });
});
