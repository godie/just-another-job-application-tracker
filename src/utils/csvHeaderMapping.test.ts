import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CANONICAL_CSV_FIELDS,
  JUDGMENT_CSV_FIELDS,
  matchCanonicalField,
  mapColumnAnswer,
  resolveCsvColumns,
} from './csvHeaderMapping';

vi.mock('./aiJudgments', () => ({ askJudgments: vi.fn() }));

import { askJudgments } from './aiJudgments';

const mockedAskJudgments = vi.mocked(askJudgments);

describe('field lists', () => {
  it('keeps id out of the judgment options while still matching it exactly', () => {
    expect(CANONICAL_CSV_FIELDS).toContain('id');
    expect(JUDGMENT_CSV_FIELDS).not.toContain('id');
    expect(JUDGMENT_CSV_FIELDS.length).toBe(CANONICAL_CSV_FIELDS.length - 1);
  });
});

describe('matchCanonicalField', () => {
  it('matches the canonical names case-insensitively', () => {
    expect(matchCanonicalField('position')).toBe('position');
    expect(matchCanonicalField('Company')).toBe('company');
    expect(matchCanonicalField(' applicationDate ')).toBe('applicationDate');
  });

  it('returns null for foreign headers', () => {
    expect(matchCanonicalField('Job Title')).toBeNull();
    expect(matchCanonicalField('Empresa')).toBeNull();
    expect(matchCanonicalField('')).toBeNull();
  });
});

describe('mapColumnAnswer', () => {
  it('accepts a confident field', () => {
    expect(mapColumnAnswer(0, 'Job Title', { choice: 'position', confidence: 0.9 })).toEqual({
      index: 0,
      header: 'Job Title',
      field: 'position',
      verdict: 'auto',
      confidence: 0.9,
    });
  });

  it('flags the review band', () => {
    expect(mapColumnAnswer(1, 'Estado', { choice: 'status', confidence: 0.62 }).verdict).toBe('review');
  });

  it('treats ignore, unknown options and low confidence as unmapped', () => {
    expect(mapColumnAnswer(0, 'x', { choice: 'ignore', confidence: 0.99 }).field).toBeNull();
    expect(mapColumnAnswer(0, 'x', { choice: 'not_a_field', confidence: 0.99 }).field).toBeNull();
    expect(mapColumnAnswer(0, 'x', { choice: 'position', confidence: 0.3 }).field).toBeNull();
  });

  it('never adopts a record id from a foreign column', () => {
    expect(mapColumnAnswer(0, '_id interno', { choice: 'id', confidence: 1 }).field).toBeNull();
  });
});

describe('resolveCsvColumns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves canonical headers without calling the judgment', async () => {
    const { fields, review, unmapped } = await resolveCsvColumns([
      'position',
      'company',
      'applicationDate',
    ]);

    expect(mockedAskJudgments).not.toHaveBeenCalled();
    expect(fields).toEqual(['position', 'company', 'applicationDate']);
    expect(review).toEqual([]);
    expect(unmapped).toEqual([]);
  });

  it('asks one question per unresolved header, only for those', async () => {
    mockedAskJudgments.mockResolvedValue({
      answers: {
        column_0: { type: 'choice', choice: 'position', confidence: 0.94 },
        column_1: { type: 'choice', choice: 'company', confidence: 0.9 },
        column_2: { type: 'choice', choice: 'ignore', confidence: 0.97 },
      },
      usage: null,
    });

    const { fields, review, unmapped } = await resolveCsvColumns([
      'Job Title',
      'Empresa',
      '_id interno',
      'position',
    ]);

    expect(mockedAskJudgments).toHaveBeenCalledTimes(1);
    const [, questions] = mockedAskJudgments.mock.calls[0];
    expect(Object.keys(questions)).toEqual(['column_0', 'column_1', 'column_2']);
    expect(fields).toEqual(['position', 'company', null, 'position']);
    expect(review).toEqual([]);
    expect(unmapped).toEqual(['_id interno']);
  });

  it('reports the review band so the UI can ask', async () => {
    mockedAskJudgments.mockResolvedValue({
      answers: { column_0: { type: 'choice', choice: 'status', confidence: 0.6 } },
      usage: null,
    });

    const { fields, review } = await resolveCsvColumns(['Estado']);

    expect(fields).toEqual(['status']);
    expect(review).toEqual(['Estado']);
  });

  it('keeps only the canonical headers when the judgment is unavailable', async () => {
    mockedAskJudgments.mockResolvedValue(null);

    const { fields, unmapped } = await resolveCsvColumns(['position', 'Job Title']);

    expect(fields).toEqual(['position', null]);
    expect(unmapped).toEqual(['Job Title']);
  });

  it('offers every mappable field as a judgment option', async () => {
    mockedAskJudgments.mockResolvedValue({ answers: {}, usage: null });

    await resolveCsvColumns(['Job Title']);

    const [, questions] = mockedAskJudgments.mock.calls[0];
    const criteria = questions.column_0.criteria as Record<string, string>;
    JUDGMENT_CSV_FIELDS.forEach((field) => expect(criteria).toHaveProperty(field));
    expect(criteria).toHaveProperty('ignore');
    expect(criteria).not.toHaveProperty('id');
  });
});
