import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { JobOpportunity } from '../types/opportunities';
import type { UserMatchProfile } from '../types/matching';
import {
  SCORE_ESCALATION_CONFIDENCE,
  SCORE_LEVELS,
  SCORE_WEIGHTS,
  composeOverall,
  composeSubscores,
  mapConfidence,
  scoreOpportunityWithJudgment,
  scoreToPercent,
} from './opportunityScoring';

vi.mock('./aiJudgments', () => ({ askJudgments: vi.fn() }));

import { askJudgments } from './aiJudgments';

const mockedAskJudgments = vi.mocked(askJudgments);

const opportunity = {
  id: 'opp-1',
  position: 'Senior Frontend Engineer',
  company: 'Figma',
  link: 'https://example.com',
  location: 'Remote (EU)',
  jobType: 'Remote',
  salary: 'EUR 110000 - 130000',
  description: 'React, TypeScript, design systems.',
  capturedDate: '2026-01-01',
} as JobOpportunity;

const profile = {
  targetRoles: ['Senior Frontend Engineer'],
  seniority: 'senior',
  topSkills: ['react', 'typescript'],
  preferredWorkTypes: ['remote'],
  preferredLocations: ['Berlin'],
  salaryRange: { min: 90000, max: 130000, currency: 'EUR' },
  preferredIndustries: [],
  profileSummary: 'Senior product engineer.',
  successPatterns: [],
  avoidPatterns: [],
  profileVersion: 3,
  confidence: 'high',
  lastComputed: '2026-01-01',
} as UserMatchProfile;

/** All six dimensions answered at the given level index with the given confidence. */
function scoreAnswers(level: number, confidence = 0.9) {
  return Object.fromEntries(
    (Object.keys(SCORE_WEIGHTS) as string[]).map((dimension) => [
      dimension,
      { type: 'score', score: level, legend: {}, probabilities: {}, confidence },
    ]),
  );
}

describe('scoreToPercent', () => {
  it('maps the level scale onto 0-100', () => {
    expect(scoreToPercent(0)).toBe(0);
    expect(scoreToPercent(SCORE_LEVELS.length - 1)).toBe(100);
    expect(scoreToPercent((SCORE_LEVELS.length - 1) / 2)).toBe(50);
  });

  it('clamps out-of-range and invalid values', () => {
    expect(scoreToPercent(-3)).toBe(0);
    expect(scoreToPercent(99)).toBe(100);
    expect(scoreToPercent(Number.NaN)).toBe(0);
  });
});

describe('composeSubscores / composeOverall', () => {
  it('requires every dimension and returns null when one is missing', () => {
    expect(composeSubscores(scoreAnswers(4))).not.toBeNull();
    const partial = scoreAnswers(4);
    delete (partial as Record<string, unknown>).seniorityFit;
    expect(composeSubscores(partial)).toBeNull();
  });

  it('rejects answers that are not scores', () => {
    const wrong = scoreAnswers(4);
    (wrong as Record<string, unknown>).skillsFit = { type: 'noul', noul: 0.8 };
    expect(composeSubscores(wrong)).toBeNull();
  });

  it('applies the shared weights', () => {
    const allExcellent = composeSubscores(scoreAnswers(SCORE_LEVELS.length - 1))!;
    expect(composeOverall(allExcellent)).toBe(100);

    const allPartial = composeSubscores(scoreAnswers(2))!;
    expect(composeOverall(allPartial)).toBe(50);

    const skillsOnly = { ...allPartial, skillsFit: 100, semanticFit: 100 };
    expect(composeOverall(skillsOnly)).toBeGreaterThan(composeOverall(allPartial));
  });
});

describe('mapConfidence', () => {
  it('maps the model certainty onto the app labels', () => {
    expect(mapConfidence(0.9)).toBe('high');
    expect(mapConfidence(0.65)).toBe('medium');
    expect(mapConfidence(0.4)).toBe('low');
  });
});

describe('scoreOpportunityWithJudgment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('asks the six dimensions in one request and composes the result', async () => {
    mockedAskJudgments.mockResolvedValue({
      answers: scoreAnswers(4, 0.85),
      usage: { input_tokens: 900, output_tokens: 80 },
    });

    const judgment = await scoreOpportunityWithJudgment(opportunity, profile);

    expect(mockedAskJudgments).toHaveBeenCalledTimes(1);
    const [, questions] = mockedAskJudgments.mock.calls[0];
    expect(Object.keys(questions).sort()).toEqual(Object.keys(SCORE_WEIGHTS).sort());
    expect(questions.semanticFit.criteria).toEqual([...SCORE_LEVELS]);

    expect(judgment?.minConfidence).toBeCloseTo(0.85);
    expect(judgment?.result.overallScore).toBe(100);
    expect(judgment?.result.confidence).toBe('high');
    expect(judgment?.result.verdict).toBe('excellent_fit');
    expect(judgment?.result.strengths.length).toBeGreaterThan(0);
    expect(judgment?.result.profileVersion).toBe(profile.profileVersion);
  });

  it('reports the lowest confidence across the answers', async () => {
    const answers = scoreAnswers(3, 0.9);
    (answers as Record<string, { confidence: number }>).compensationFit.confidence = 0.42;
    mockedAskJudgments.mockResolvedValue({ answers, usage: null });

    const judgment = await scoreOpportunityWithJudgment(opportunity, profile);

    expect(judgment?.minConfidence).toBeCloseTo(0.42);
    expect(judgment!.minConfidence).toBeLessThan(SCORE_ESCALATION_CONFIDENCE);
    expect(judgment?.result.confidence).toBe('low');
  });

  it('returns null when the service is unavailable', async () => {
    mockedAskJudgments.mockResolvedValue(null);
    await expect(scoreOpportunityWithJudgment(opportunity, profile)).resolves.toBeNull();
  });

  it('returns null on a partial answer so the caller can escalate', async () => {
    const partial = scoreAnswers(4);
    delete (partial as Record<string, unknown>).historicalFit;
    mockedAskJudgments.mockResolvedValue({ answers: partial, usage: null });

    await expect(scoreOpportunityWithJudgment(opportunity, profile)).resolves.toBeNull();
  });
});
