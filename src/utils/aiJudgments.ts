import { API_BASE_URL } from './apiBase';
import { defaultFetchOptions } from './fetchDefaults';
import { fetchWithTrace } from './api';

type JudgmentType = 'choice' | 'score' | 'noul';

interface JudgmentQuestion {
  type: JudgmentType;
  instructions: string | Record<string, unknown>;
  criteria?: unknown;
}

interface ChoiceAnswer {
  type: 'choice';
  choice: string;
  probabilities: Record<string, number>;
  confidence: number;
}

interface ScoreAnswer {
  type: 'score';
  score: number;
  legend: Record<string, string>;
  probabilities: Record<string, number>;
  confidence: number;
}

interface NoulAnswer {
  type: 'noul';
  noul: number;
}

type JudgmentAnswer = ChoiceAnswer | ScoreAnswer | NoulAnswer;

interface JudgmentUsage {
  input_tokens: number;
  output_tokens: number;
}

interface JudgmentResult {
  answers: Record<string, JudgmentAnswer>;
  usage: JudgmentUsage | null;
}

interface JudgmentResponse {
  success: boolean;
  answers?: Record<string, JudgmentAnswer>;
  usage?: JudgmentUsage | null;
  error?: string;
}

/**
 * Ask the server-side proxy for typed judgments.
 *
 * The TypeSafe key never reaches the browser: `POST /api/ai/judgments` holds
 * it and enforces an authenticated session. Returns `null` on any failure
 * (missing configuration, offline, invalid answer) so callers can fall back
 * to their deterministic behaviour instead of breaking.
 */
export async function askJudgments(
  state: unknown,
  questions: Record<string, JudgmentQuestion>,
): Promise<JudgmentResult | null> {
  try {
    const response = await fetchWithTrace(`${API_BASE_URL}/ai/judgments`, {
      ...defaultFetchOptions,
      method: 'POST',
      body: JSON.stringify({ state, questions }),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as JudgmentResponse;
    if (!data.success || !data.answers) return null;

    return { answers: data.answers, usage: data.usage ?? null };
  } catch {
    return null;
  }
}
