import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { JobApplication } from '../types/applications';
import {
  MATCH_AUTO_CONFIDENCE,
  MATCH_REVIEW_CONFIDENCE,
  MAX_MATCH_CANDIDATES,
  buildMatchCandidates,
  decideMatch,
  matchEmailToApplication,
} from './applicationMatch';

vi.mock('./aiJudgments', () => ({ askJudgments: vi.fn() }));

import { askJudgments } from './aiJudgments';

const mockedAskJudgments = vi.mocked(askJudgments);

function makeApp(overrides: Partial<JobApplication> = {}): JobApplication {
  return {
    id: 'app-1',
    position: 'Senior Engineer',
    company: 'Acme',
    status: 'interviewing',
    applicationDate: '2026-01-15',
    timeline: [],
    ...overrides,
  } as JobApplication;
}

describe('buildMatchCandidates', () => {
  it('drops deleted applications and sorts newest first', () => {
    const candidates = buildMatchCandidates([
      makeApp({ id: 'old', applicationDate: '2025-01-01' }),
      makeApp({ id: 'deleted', status: 'Deleted', applicationDate: '2026-06-01' }),
      makeApp({ id: 'new', applicationDate: '2026-05-01' }),
    ]);

    expect(candidates.map((c) => c.id)).toEqual(['new', 'old']);
  });

  it('caps the number of options (TypeSafe allows 255)', () => {
    const many = Array.from({ length: MAX_MATCH_CANDIDATES + 25 }, (_, index) =>
      makeApp({ id: `app-${index}`, applicationDate: `2026-01-${String((index % 28) + 1).padStart(2, '0')}` }),
    );

    expect(buildMatchCandidates(many)).toHaveLength(MAX_MATCH_CANDIDATES);
  });
});

describe('decideMatch', () => {
  const ids = new Set(['app-1', 'app-2']);

  it('accepts a confident match', () => {
    expect(decideMatch({ choice: 'app-1', confidence: MATCH_AUTO_CONFIDENCE }, ids)).toEqual({
      applicationId: 'app-1',
      verdict: 'auto',
      confidence: MATCH_AUTO_CONFIDENCE,
    });
  });

  it('flags a mid-confidence match for review', () => {
    expect(decideMatch({ choice: 'app-2', confidence: 0.61 }, ids)).toEqual({
      applicationId: 'app-2',
      verdict: 'review',
      confidence: 0.61,
    });
  });

  it('treats the review gate as inclusive at the boundary', () => {
    expect(decideMatch({ choice: 'app-1', confidence: MATCH_REVIEW_CONFIDENCE }, ids).verdict).toBe('review');
    expect(decideMatch({ choice: 'app-1', confidence: MATCH_REVIEW_CONFIDENCE - 0.01 }, ids).verdict).toBe('new');
  });

  it('falls back to a new application below the review gate', () => {
    expect(decideMatch({ choice: 'app-1', confidence: 0.42 }, ids)).toEqual({
      applicationId: null,
      verdict: 'new',
      confidence: 0.42,
    });
  });

  it('falls back when the model answers none', () => {
    expect(decideMatch({ choice: 'none', confidence: 0.99 }, ids).applicationId).toBeNull();
  });

  it('falls back when the option is not a known candidate', () => {
    expect(decideMatch({ choice: 'invented', confidence: 0.99 }, ids).applicationId).toBeNull();
  });

  it('falls back when there is no answer', () => {
    expect(decideMatch(undefined, ids).verdict).toBe('new');
  });
});

describe('matchEmailToApplication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the judgment decision', async () => {
    mockedAskJudgments.mockResolvedValue({
      answers: { match: { type: 'choice', choice: 'app-1', probabilities: { 'app-1': 0.9 }, confidence: 0.9 } },
      usage: null,
    });

    const decision = await matchEmailToApplication(
      { subject: 'Interview invitation for Senior Engineer at Acme', from: 'r@acme.com', body: 'Let us schedule.' },
      [makeApp(), makeApp({ id: 'app-2', company: 'Globex', position: 'Data Analyst' })],
    );

    expect(decision).toEqual({ applicationId: 'app-1', verdict: 'auto', confidence: 0.9 });
    const [state, questions] = mockedAskJudgments.mock.calls[0];
    expect((state as { candidates: unknown[] }).candidates).toHaveLength(2);
    expect(questions.match.type).toBe('choice');
  });

  it('returns null when the judgment service is unavailable', async () => {
    mockedAskJudgments.mockResolvedValue(null);

    await expect(
      matchEmailToApplication({ subject: 'anything' }, [makeApp()]),
    ).resolves.toBeNull();
  });

  it('does not call the service when there are no candidates', async () => {
    await expect(matchEmailToApplication({ subject: 'x' }, [])).resolves.toBeNull();
    expect(mockedAskJudgments).not.toHaveBeenCalled();
  });

  it('ignores a non-choice answer', async () => {
    mockedAskJudgments.mockResolvedValue({
      answers: { match: { type: 'noul', noul: 0.9 } },
      usage: null,
    });

    await expect(matchEmailToApplication({ subject: 'x' }, [makeApp()])).resolves.toBeNull();
  });
});
