import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { JobOpportunity } from '../types/opportunities';
import type { UserMatchProfile, JobMatchResult } from '../types/matching';

vi.mock('./opportunityScoring', () => ({
  SCORE_ESCALATION_CONFIDENCE: 0.6,
  scoreOpportunityWithJudgment: vi.fn(),
}));

vi.mock('./geminiApi', () => ({ callGeminiApi: vi.fn() }));

import { scoreOpportunityWithJudgment } from './opportunityScoring';
import { callGeminiApi } from './geminiApi';
import { batchCalculateHybridScores } from './geminiJobScoring';

const mockedJudgment = vi.mocked(scoreOpportunityWithJudgment);
const mockedCallGemini = vi.mocked(callGeminiApi);

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
  profileVersion: 1,
  confidence: 'high',
  lastComputed: '2026-01-01',
} as UserMatchProfile;

const judgmentResult = {
  opportunityId: 'opp-1',
  overallScore: 90,
  confidence: 'high',
  subscores: {
    semanticFit: 90,
    historicalFit: 90,
    skillsFit: 90,
    locationWorkTypeFit: 90,
    compensationFit: 90,
    seniorityFit: 90,
  },
  strengths: ['Strong skills match (90%)'],
  gaps: ['Limited data available to identify gaps'],
  verdict: 'excellent_fit',
  explanation: 'This is an excellent match with strong skills alignment.',
  profileVersion: 1,
  computedAt: '2026-01-01T00:00:00.000Z',
  computationMethod: 'hybrid',
} as JobMatchResult;

const geminiJson = JSON.stringify({
  overallScore: 40,
  semanticFit: 40,
  historicalFit: 40,
  skillsFit: 40,
  locationWorkTypeFit: 40,
  compensationFit: 40,
  seniorityFit: 40,
  confidence: 'medium',
  strengths: ['Gemini strength'],
  gaps: ['Gemini gap'],
  verdict: 'partial_fit',
  explanation: 'Gemini explanation.',
});

describe('batchCalculateHybridScores AI preference order', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses a confident judgment without calling Gemini', async () => {
    mockedJudgment.mockResolvedValue({ result: judgmentResult, minConfidence: 0.9 });

    const results = await batchCalculateHybridScores('gemini-key', [opportunity], profile, true);

    expect(mockedJudgment).toHaveBeenCalledTimes(1);
    expect(mockedCallGemini).not.toHaveBeenCalled();
    expect(results['opp-1'].computationMethod).toBe('hybrid');
    expect(results['opp-1'].confidence).toBe('high');
    expect(results['opp-1'].verdict).toBe('excellent_fit');
  });

  it('escalates to Gemini when the judgment is unsure', async () => {
    mockedJudgment.mockResolvedValue({ result: judgmentResult, minConfidence: 0.3 });
    mockedCallGemini.mockResolvedValue(geminiJson);

    const results = await batchCalculateHybridScores('gemini-key', [opportunity], profile, true);

    expect(mockedCallGemini).toHaveBeenCalledTimes(1);
    expect(results['opp-1'].verdict).toBe('partial_fit');
    expect(results['opp-1'].confidence).toBe('medium');
  });

  it('escalates to Gemini when the judgment service is unavailable', async () => {
    mockedJudgment.mockResolvedValue(null);
    mockedCallGemini.mockResolvedValue(geminiJson);

    const results = await batchCalculateHybridScores('gemini-key', [opportunity], profile, true);

    expect(mockedCallGemini).toHaveBeenCalledTimes(1);
    expect(results['opp-1'].verdict).toBe('partial_fit');
  });

  it('keeps the low-confidence judgment when no Gemini key is available', async () => {
    mockedJudgment.mockResolvedValue({ result: judgmentResult, minConfidence: 0.3 });

    const results = await batchCalculateHybridScores(null, [opportunity], profile, true);

    expect(mockedCallGemini).not.toHaveBeenCalled();
    expect(results['opp-1'].verdict).toBe('excellent_fit');
  });

  it('returns the deterministic score when both AI paths are unavailable', async () => {
    mockedJudgment.mockResolvedValue(null);

    const results = await batchCalculateHybridScores(null, [opportunity], profile, true);

    expect(results['opp-1'].computationMethod).toBe('deterministic');
  });

  it('honours the AI preference toggle and never calls a judgment when disabled', async () => {
    const results = await batchCalculateHybridScores('gemini-key', [opportunity], profile, false);

    expect(mockedJudgment).not.toHaveBeenCalled();
    expect(mockedCallGemini).not.toHaveBeenCalled();
    expect(results['opp-1'].computationMethod).toBe('deterministic');
  });
});
