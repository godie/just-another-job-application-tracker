import { describe, it, expect, beforeEach } from 'vitest';
import type { ScanAuditRow } from '../mails/types';
import {
  auditStats,
  buildAuditDataset,
  isCorrected,
  loadAuditLabels,
  saveAuditLabels,
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

    expect(auditStats(rows, labels)).toEqual({ total: 2, reviewed: 1, corrected: 1 });
  });
});

describe('dataset exports', () => {
  it('builds a row with both pipeline result and label', () => {
    const [datasetRow] = buildAuditDataset([makeRow()], { m1: { position: 'Staff Engineer' } });

    expect(datasetRow.pipeline).toEqual({
      eventType: 'next_steps',
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

    expect(parsed.stats).toEqual({ total: 1, reviewed: 1, corrected: 0 });
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.exportedAt).toBeTruthy();
  });

  it('exports CSV with quoted cells and a header', () => {
    const csv = toAuditCsv([makeRow()], { m1: { eventType: 'rejected', reviewed: true } });
    const [header, first] = csv.split('\n');

    expect(header).toContain('pipeline_eventType');
    expect(header).toContain('label_eventType');
    expect(first).toContain('"next_steps"');
    expect(first).toContain('"rejected"');
    expect(first).toContain('"yes"');
    expect(csv).toContain('""next week""'); // inner quotes are doubled
  });
});
