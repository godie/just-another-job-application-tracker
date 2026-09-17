import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractHybridDays,
  normalizeDate,
  normalizeWorkType,
  normalizeWorkTypes,
} from './fieldNormalization';

vi.mock('./aiJudgments', () => ({ askJudgments: vi.fn() }));

import { askJudgments } from './aiJudgments';

const mockedAskJudgments = vi.mocked(askJudgments);

describe('normalizeWorkType', () => {
  it('reads the common English and Spanish wordings', () => {
    expect(normalizeWorkType('Remote (EU)')).toBe('remote');
    expect(normalizeWorkType('En remoto')).toBe('remote');
    expect(normalizeWorkType('Home office')).toBe('remote');
    expect(normalizeWorkType('Híbrido (3 días)')).toBe('hybrid');
    expect(normalizeWorkType('Hybrid — 2 days in office')).toBe('hybrid');
    expect(normalizeWorkType('Presencial')).toBe('on-site');
    expect(normalizeWorkType('On-site only')).toBe('on-site');
  });

  it('leaves unknown wording and empty values unresolved', () => {
    expect(normalizeWorkType('Flexible depending on the team')).toBeUndefined();
    expect(normalizeWorkType('Full-time')).toBeUndefined();
    expect(normalizeWorkType('')).toBeUndefined();
    expect(normalizeWorkType(null)).toBeUndefined();
  });
});

describe('extractHybridDays', () => {
  it('reads office days when the text states them', () => {
    expect(extractHybridDays('Híbrido (3 días)')).toBe(3);
    expect(extractHybridDays('Hybrid, 2 days in office')).toBe(2);
    expect(extractHybridDays('hybrid / 5 days per week')).toBe(5);
  });

  it('ignores values without usable day counts', () => {
    expect(extractHybridDays('híbrido')).toBeUndefined();
    expect(extractHybridDays('9 days')).toBeUndefined();
  });
});

describe('normalizeDate', () => {
  it('passes ISO dates through', () => {
    expect(normalizeDate('2026-03-12')).toBe('2026-03-12');
  });

  it('resolves numeric dates with the preferred order', () => {
    expect(normalizeDate('03/04/2026', 'DMY')).toBe('2026-04-03');
    expect(normalizeDate('03/04/2026', 'MDY')).toBe('2026-03-04');
    expect(normalizeDate('12.03.26', 'DMY')).toBe('2026-03-12');
  });

  it('reads month names in both languages', () => {
    expect(normalizeDate('12 de marzo de 2026')).toBe('2026-03-12');
    expect(normalizeDate('March 12, 2026')).toBe('2026-03-12');
    expect(normalizeDate('1 setiembre 2026')).toBe('2026-09-01');
  });

  it('rejects impossible and unparseable dates', () => {
    expect(normalizeDate('31/02/2026')).toBeUndefined();
    expect(normalizeDate('not a date')).toBeUndefined();
    expect(normalizeDate('')).toBeUndefined();
  });
});

describe('normalizeWorkTypes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves aliases without calling the service', async () => {
    const result = await normalizeWorkTypes(['Remote (EU)', 'Híbrido (3 días)']);

    expect(mockedAskJudgments).not.toHaveBeenCalled();
    expect(result.get('Remote (EU)')).toMatchObject({ workType: 'remote', source: 'alias' });
    expect(result.get('Híbrido (3 días)')).toMatchObject({ workType: 'hybrid', hybridDays: 3 });
  });

  it('asks one batched request for the unresolved values only', async () => {
    mockedAskJudgments.mockResolvedValue({
      answers: { value_0: { type: 'choice', choice: 'hybrid', probabilities: {}, confidence: 0.85 } },
      usage: null,
    });

    const result = await normalizeWorkTypes(['Remote (EU)', 'Flexible depending on the team']);

    expect(mockedAskJudgments).toHaveBeenCalledTimes(1);
    const [state, questions] = mockedAskJudgments.mock.calls[0];
    expect(Object.keys(questions)).toEqual(['value_0']);
    expect((state as { work_type_values: string[] }).work_type_values).toEqual(['Flexible depending on the team']);
    expect(result.get('Flexible depending on the team')).toMatchObject({ workType: 'hybrid', source: 'judgment' });
  });

  it('ignores unknown, low-confidence and unavailable answers', async () => {
    mockedAskJudgments.mockResolvedValue({
      answers: {
        value_0: { type: 'choice', choice: 'unknown', probabilities: {}, confidence: 0.9 },
        value_1: { type: 'choice', choice: 'remote', probabilities: {}, confidence: 0.3 },
      },
      usage: null,
    });

    const result = await normalizeWorkTypes(['a', 'b']);
    expect(result.size).toBe(0);

    mockedAskJudgments.mockResolvedValue(null);
    await expect(normalizeWorkTypes(['c'])).resolves.toEqual(new Map());
  });
});
