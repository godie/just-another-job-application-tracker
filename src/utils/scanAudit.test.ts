import { describe, it, expect, beforeEach } from 'vitest';
import type { ScanAuditRow } from '../mails/types';
import {
  auditStats,
  hasAuditLabel,
  labelledRows,
  pendingRows,
  reviewedRows,
  buildAuditDataset,
  diagnoseRow,
  effectiveEventType,
  isCorrected,
  loadAuditLabels,
  saveAuditLabels,
  parseAuditImport,
  loadImportedAudit,
  saveImportedAudit,
  toAuditCsv,
  toAuditJson,
  updateAuditLabel,
} from './scanAudit';

function makeRow(overrides: Partial<ScanAuditRow> = {}): ScanAuditRow {
  return {
    emailId: 'm1',
    subject: 'Interview invitation for Senior Engineer at Acme',
    from: 'recruiter@acme.com',
    date: '2026-01-05T10:00:00.000Z',
    body: 'We would like to schedule an interview, "next week".',
    classification: { type: 'next_steps', confidence: 0.9, verdict: 'auto' },
    effectiveEvent: { type: 'next_steps', source: 'judgment' },
    extraction: { position: 'Senior Engineer', company: 'Acme' },
    outcome: 'update',
    matchedApplicationId: 'app-1',
    ...overrides,
  };
}

describe('audit labels storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trips labels through localStorage', () => {
    const labels = updateAuditLabel({}, 'm1', { eventType: 'rejected', reviewed: true });
    saveAuditLabels(labels);

    expect(loadAuditLabels()).toEqual({ m1: { eventType: 'rejected', reviewed: true } });
  });

  it('returns an empty object on corrupt storage', () => {
    localStorage.setItem('emailScanAuditLabels', 'not json');
    expect(loadAuditLabels()).toEqual({});
  });

  it('merges patches for the same email', () => {
    const first = updateAuditLabel({}, 'm1', { eventType: 'offer' });
    const second = updateAuditLabel(first, 'm1', { position: 'Staff Engineer' });

    expect(second.m1).toEqual({ eventType: 'offer', position: 'Staff Engineer' });
  });
});

describe('isCorrected', () => {
  it('ignores rows without a label', () => {
    expect(isCorrected(makeRow(), undefined)).toBe(false);
  });

  it('detects a corrected event type', () => {
    expect(isCorrected(makeRow(), { eventType: 'rejected' })).toBe(true);
    expect(isCorrected(makeRow(), { eventType: 'next_steps' })).toBe(false);
  });

  it('detects corrected extraction fields but ignores empty labels', () => {
    expect(isCorrected(makeRow(), { position: 'Staff Engineer' })).toBe(true);
    expect(isCorrected(makeRow(), { position: '' })).toBe(false);
    expect(isCorrected(makeRow(), { company: 'Acme Corp' })).toBe(true);
    expect(isCorrected(makeRow(), { position: 'Senior Engineer' })).toBe(false);
  });
});

describe('auditStats', () => {
  it('counts reviewed and corrected rows', () => {
    const rows = [makeRow(), makeRow({ emailId: 'm2', subject: 'Job alert', outcome: 'skipped' })];
    const labels = {
      m1: { reviewed: true, eventType: 'rejected' as const },
      m2: {},
    };

    expect(auditStats(rows, labels)).toEqual({
      total: 2,
      labelled: 1,
      reviewed: 1,
      correct: 0,
      corrected: 1,
    });
  });

  it('counts explicitly correct rows separately from corrected ones', () => {
    const rows = [makeRow(), makeRow({ emailId: 'm2' })];
    const labels = {
      m1: { reviewed: true, correct: true, eventType: 'next_steps' as const },
      m2: { reviewed: true, correct: false, eventType: 'rejected' as const },
    };

    expect(auditStats(rows, labels)).toMatchObject({ reviewed: 2, correct: 1, corrected: 1 });
  });
});

describe('pendingRows and reviewedRows', () => {
  it('splits rows by the reviewed flag', () => {
    const rows = [makeRow(), makeRow({ emailId: 'm2' }), makeRow({ emailId: 'm3' })];
    const labels = { m2: { reviewed: true, reviewedAt: '2026-01-02T10:00:00.000Z' } };

    expect(pendingRows(rows, labels).map((row) => row.emailId)).toEqual(['m1', 'm3']);
    expect(reviewedRows(rows, labels).map((row) => row.emailId)).toEqual(['m2']);
  });

  it('orders reviewed rows with the most recent first', () => {
    const rows = [makeRow({ emailId: 'm1' }), makeRow({ emailId: 'm2' }), makeRow({ emailId: 'm3' })];
    const labels = {
      m1: { reviewed: true, reviewedAt: '2026-01-01T00:00:00.000Z' },
      m2: { reviewed: true, reviewedAt: '2026-01-03T00:00:00.000Z' },
      m3: { reviewed: true, reviewedAt: '2026-01-02T00:00:00.000Z' },
    };

    expect(reviewedRows(rows, labels).map((row) => row.emailId)).toEqual(['m2', 'm3', 'm1']);
  });
});

describe('effectiveEventType', () => {
  it('prefers the type the pipeline acted on over the judgment record', () => {
    const row = makeRow({
      classification: null,
      effectiveEvent: { type: 'rejected', source: 'rule' },
    });

    expect(effectiveEventType(row)).toBe('rejected');
    expect(isCorrected(row, { eventType: 'rejected' })).toBe(false);
  });

  it('falls back to the judgment when no event was used', () => {
    expect(effectiveEventType(makeRow({ effectiveEvent: null }))).toBe('next_steps');
  });
});

describe('explicit correct marker', () => {
  it('overrides a diff the reviewer typed by hand', () => {
    const row = makeRow();

    expect(isCorrected(row, { correct: true, company: 'Acme Corporation' })).toBe(false);
    expect(isCorrected(row, { correct: false })).toBe(true);
  });
});

describe('diagnoseRow', () => {
  it('returns null without a label', () => {
    expect(diagnoseRow(makeRow(), undefined)).toBeNull();
    expect(diagnoseRow(makeRow(), {})).toBeNull();
  });

  it('flags a happy path as nothing wrong', () => {
    expect(diagnoseRow(makeRow(), { eventType: 'next_steps', reviewed: true })).toEqual({
      typeWrong: false,
      fieldsWrong: false,
      missed: false,
      falsePositive: false,
      insufficient: false,
    });
  });

  it('flags a disagreement between two work events', () => {
    expect(diagnoseRow(makeRow(), { eventType: 'rejected' })).toMatchObject({ typeWrong: true });
  });

  it('flags a work email the pipeline never saw as an event', () => {
    const row = makeRow({ classification: null, effectiveEvent: null, outcome: 'no_event' });

    expect(diagnoseRow(row, { eventType: 'rejected' })).toMatchObject({
      missed: true,
      insufficient: false,
    });
  });

  it('flags an empty body the pipeline could not read', () => {
    const row = makeRow({ body: '', classification: null, effectiveEvent: null, outcome: 'no_event' });

    expect(diagnoseRow(row, { eventType: 'rejected' })).toMatchObject({
      missed: true,
      insufficient: true,
    });
  });

  it('flags a non-work email that the pipeline classified as work', () => {
    expect(diagnoseRow(makeRow(), { eventType: 'other' })).toMatchObject({
      falsePositive: true,
      typeWrong: false,
    });
  });

  it('flags a wrong field with the right type', () => {
    expect(diagnoseRow(makeRow(), { eventType: 'next_steps', company: 'Acme Corp' })).toMatchObject({
      typeWrong: false,
      fieldsWrong: true,
    });
  });
});

describe('dataset exports', () => {
  it('builds a row with both pipeline result and label', () => {
    const [datasetRow] = buildAuditDataset([makeRow()], { m1: { position: 'Staff Engineer' } });

    expect(datasetRow.pipeline).toEqual({
      eventType: 'next_steps',
      source: 'judgment',
      classifiedEventType: 'next_steps',
      confidence: 0.9,
      verdict: 'auto',
      position: 'Senior Engineer',
      company: 'Acme',
      outcome: 'update',
      matchedApplicationId: 'app-1',
    });
    expect(datasetRow.label).toEqual({ position: 'Staff Engineer' });
  });

  it('exports JSON with stats and rows', () => {
    const parsed = JSON.parse(toAuditJson([makeRow()], { m1: { reviewed: true } }));

    expect(parsed.stats).toEqual({
      total: 1,
      labelled: 1,
      reviewed: 1,
      correct: 0,
      corrected: 0,
    });
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.exportedAt).toBeTruthy();
  });

  it('counts a note-only label as labelled', () => {
    expect(hasAuditLabel(undefined)).toBe(false);
    expect(hasAuditLabel({})).toBe(false);
    expect(hasAuditLabel({ note: 'asked for a follow-up' })).toBe(true);
    expect(hasAuditLabel({ reviewed: true })).toBe(true);
  });

  it('exports only the labelled rows and keeps the scanned total', () => {
    const rows = [makeRow(), makeRow({ emailId: 'm2', subject: 'Job alert', outcome: 'skipped' })];
    const labels = { m1: { eventType: 'rejected' as const } };

    expect(labelledRows(rows, labels).map((row) => row.emailId)).toEqual(['m1']);

    const json = JSON.parse(toAuditJson(rows, labels));
    expect(json.scannedTotal).toBe(2);
    expect(json.rows).toHaveLength(1);
    expect(json.stats.total).toBe(1);

    const csv = toAuditCsv(rows, labels).split('\n').slice(1);
    expect(csv).toHaveLength(1);
    expect(csv[0]).toContain('"m1"');
    expect(csv[0]).not.toContain('Job alert');
  });

  it('exports CSV with quoted cells and a header', () => {
    const csv = toAuditCsv([makeRow()], { m1: { eventType: 'rejected', reviewed: true } });
    const [header, first] = csv.split('\n');

    expect(header).toContain('pipeline_eventType');
    expect(header).toContain('label_eventType');
    expect(header).toContain('label_rejectionKind');
    expect(first).toContain('"next_steps"');
    expect(first).toContain('"rejected"');
    expect(first).toContain('"yes"');
    expect(csv).toContain('""next week""'); // inner quotes are doubled
  });

  it('carries the rejection kind and the note through both exports', () => {
    const labels = {
      m1: { eventType: 'rejected' as const, rejectionKind: 'after_interview' as const, note: 'had a human interview' },
    };

    const csv = toAuditCsv([makeRow()], labels);
    expect(csv).toContain('"after_interview"');
    expect(csv).toContain('"had a human interview"');

    const json = JSON.parse(toAuditJson([makeRow()], labels));
    expect(json.rows[0].label).toEqual(labels.m1);
  });
});

describe('parseAuditImport', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trips an export back into rows and labels', () => {
    const rows = [makeRow(), makeRow({ emailId: 'm2', subject: 'Job alert', outcome: 'skipped', effectiveEvent: null, classification: null })];
    const labels = { m1: { eventType: 'next_steps' as const, reviewed: true, correct: true } };
    const imported = parseAuditImport(toAuditJson(rows, labels));

    expect(imported?.rows.map((row) => row.emailId)).toEqual(['m1']);
    expect(imported?.rows[0].effectiveEvent).toEqual({ type: 'next_steps', source: 'judgment' });
    expect(imported?.rows[0].classification).toEqual({
      type: 'next_steps',
      confidence: 0.9,
      verdict: 'auto',
    });
    expect(imported?.labels).toEqual(labels);
    expect(imported?.exportedAt).toBeTruthy();
  });

  it('rebuilds the effective type of a rule-only row', () => {
    const rows = [
      makeRow({
        classification: null,
        effectiveEvent: { type: 'rejected', source: 'rule' },
        outcome: 'update',
      }),
    ];
    const imported = parseAuditImport(toAuditJson(rows, { m1: { eventType: 'rejected' } }));

    expect(imported?.rows[0].effectiveEvent).toEqual({ type: 'rejected', source: 'rule' });
    expect(imported?.rows[0].classification).toBeNull();
  });

  it('reads a file written before effectiveEvent existed', () => {
    const legacy = JSON.stringify({
      scannedTotal: 2,
      rows: [
        {
          emailId: 'old-1',
          subject: 'Update on your application',
          from: 'kyndryl@myworkday.com',
          date: '2026-01-05T10:00:00.000Z',
          body: '',
          pipeline: { eventType: null, confidence: null, verdict: null, outcome: 'no_event' },
          label: { eventType: 'rejected', reviewed: true },
        },
      ],
    });
    const imported = parseAuditImport(legacy);

    expect(imported?.rows[0].emailId).toBe('old-1');
    expect(imported?.rows[0].effectiveEvent).toBeNull();
    expect(imported?.labels['old-1']).toEqual({ eventType: 'rejected', reviewed: true });
  });

  it('accepts a bare array of labelled rows', () => {
    const imported = parseAuditImport(JSON.stringify([{ emailId: 'm9', subject: 'Hi', label: { reviewed: true } }]));

    expect(imported?.rows.map((row) => row.emailId)).toEqual(['m9']);
    expect(imported?.labels.m9).toEqual({ reviewed: true });
  });

  it('rejects unusable input', () => {
    expect(parseAuditImport('not json')).toBeNull();
    expect(parseAuditImport('{}')).toBeNull();
    expect(parseAuditImport('{"rows":[]}')).toBeNull();
    expect(parseAuditImport('{"rows":[{"subject":"no id"}]}')).toBeNull();
  });

  it('persists every row, labelled or not', () => {
    saveImportedAudit({
      exportedAt: '2026-09-18T00:00:00.000Z',
      rows: [makeRow(), makeRow({ emailId: 'm2', subject: 'Pending one' })],
      labels: { m1: { eventType: 'next_steps' as const, reviewed: true } },
    });

    const loaded = loadImportedAudit();
    expect(loaded?.rows.map((row) => row.emailId)).toEqual(['m1', 'm2']);
    expect(loaded?.labels.m1).toMatchObject({ reviewed: true });

    saveImportedAudit(null);
    expect(loadImportedAudit()).toBeNull();
  });
});
