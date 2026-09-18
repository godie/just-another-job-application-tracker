import { describe, it, expect } from 'vitest';
import type { ScanAuditRow } from '../types';
import { reclassifyRowLocally, reclassifyRowsLocally } from './localReclassify';

function makeRow(overrides: Partial<ScanAuditRow> = {}): ScanAuditRow {
  return {
    emailId: 'm1',
    subject: 'Your application',
    from: 'hr@acme.com',
    date: '2026-01-05T10:00:00.000Z',
    body: '',
    classification: null,
    effectiveEvent: null,
    extraction: {},
    outcome: 'no_event',
    ...overrides,
  };
}

describe('reclassifyRowLocally', () => {
  it('reads a rejection the keyword cascade knows', () => {
    const local = reclassifyRowLocally(
      makeRow({ subject: 'We regret to inform you', body: 'Position has been filled.' }),
    );

    expect(local?.type).toBe('rejected');
  });

  it('reads a confirmation from the body', () => {
    const local = reclassifyRowLocally(
      makeRow({ subject: 'Thanks!', body: 'Thank you for applying to Acme.' }),
    );

    expect(local?.type).toBe('application_submitted');
  });

  it('returns null when no rule fires', () => {
    expect(reclassifyRowLocally(makeRow({ subject: 'Hello', body: 'See you soon' }))).toBeNull();
  });
});

describe('reclassifyRowsLocally', () => {
  it('counts agreement against the type the pipeline used', () => {
    const rows = [
      makeRow({ emailId: 'a', subject: 'We regret to inform you', effectiveEvent: { type: 'rejected', source: 'judgment' } }),
      makeRow({ emailId: 'b', subject: 'We regret to inform you', effectiveEvent: { type: 'offer', source: 'judgment' } }),
    ];

    const { results, agree, total } = reclassifyRowsLocally(rows);

    expect(results.get('a')?.type).toBe('rejected');
    expect(agree).toBe(1);
    expect(total).toBe(2);
  });

  it('falls back to the judgment type when no event was used', () => {
    const rows = [
      makeRow({
        subject: 'We regret to inform you',
        classification: { type: 'rejected', confidence: 0.9, verdict: 'auto' },
      }),
    ];

    expect(reclassifyRowsLocally(rows).agree).toBe(1);
  });

  it('counts two silent rows as agreement', () => {
    expect(reclassifyRowsLocally([makeRow({ subject: 'Hello', body: 'See you soon' })]).agree).toBe(1);
  });
});
