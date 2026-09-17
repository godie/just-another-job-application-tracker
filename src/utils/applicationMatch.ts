import type { JobApplication } from '../types/applications';
import { askJudgments } from './aiJudgments';

/**
 * Confidence gates for the email → application judgment, from the TypeSafe
 * experiments on this codebase: clean matches answered 1.0, the fuzzy case
 * ("ACME, Inc." / "Senior Engineer II" against "Acme" / "Senior Engineer")
 * landed at 0.55-0.66, and a malformed candidate list at 0.57. Below the
 * review gate we keep the deterministic behaviour instead of guessing.
 */
export const MATCH_AUTO_CONFIDENCE = 0.7;
export const MATCH_REVIEW_CONFIDENCE = 0.5;

/** TypeSafe Choice supports at most 255 options. */
export const MAX_MATCH_CANDIDATES = 200;

const MAX_SNIPPET_CHARS = 1200;

export interface MatchCandidate {
  id: string;
  company: string;
  position: string;
  status: string;
}

type MatchVerdict = 'auto' | 'review' | 'new';

export interface MatchDecision {
  applicationId: string | null;
  verdict: MatchVerdict;
  confidence: number;
}

export interface MatchEmail {
  subject: string;
  from?: string;
  body?: string;
}

/**
 * Candidates for the judgment, newest first, so the most recent applications
 * (the ones an email is most likely about) survive the option cap.
 */
export function buildMatchCandidates(
  applications: JobApplication[],
  limit: number = MAX_MATCH_CANDIDATES,
): MatchCandidate[] {
  return applications
    .filter((app) => app.status !== 'Deleted')
    .toSorted((a, b) => {
      const aDate = a.applicationDate ?? '';
      const bDate = b.applicationDate ?? '';
      if (aDate === bDate) return 0;
      return bDate.localeCompare(aDate);
    })
    .slice(0, limit)
    .map((app) => ({
      id: app.id,
      company: app.company ?? '',
      position: app.position ?? '',
      status: app.status ?? '',
    }));
}

/**
 * Turn the model's choice into a decision. `none`, an unknown option, or a
 * confidence below the review gate all mean "do not touch an existing
 * application".
 */
export function decideMatch(
  choice: { choice: string; confidence: number } | undefined,
  validIds: ReadonlySet<string>,
): MatchDecision {
  if (!choice || choice.choice === 'none' || !validIds.has(choice.choice)) {
    return { applicationId: null, verdict: 'new', confidence: choice?.confidence ?? 0 };
  }

  if (choice.confidence >= MATCH_AUTO_CONFIDENCE) {
    return { applicationId: choice.choice, verdict: 'auto', confidence: choice.confidence };
  }
  if (choice.confidence >= MATCH_REVIEW_CONFIDENCE) {
    return { applicationId: choice.choice, verdict: 'review', confidence: choice.confidence };
  }
  return { applicationId: null, verdict: 'new', confidence: choice.confidence };
}

/**
 * Ask which existing application an email refers to. Returns `null` when the
 * judgment is unavailable (no key configured, offline, server error) so the
 * caller keeps its deterministic behaviour.
 */
export async function matchEmailToApplication(
  email: MatchEmail,
  applications: JobApplication[],
): Promise<MatchDecision | null> {
  const candidates = buildMatchCandidates(applications);
  if (candidates.length === 0) return null;

  const result = await askJudgments(
    {
      email: {
        subject: email.subject.slice(0, MAX_SNIPPET_CHARS),
        from: email.from ?? '',
        body: (email.body ?? '').slice(0, MAX_SNIPPET_CHARS),
      },
      candidates,
    },
    {
      match: {
        type: 'choice',
        instructions:
          'Which of `candidates` does `email` refer to? Match on the same company (ignore legal suffixes, punctuation and casing) and the same role. Answer none when the email is not about any of them.',
        criteria: {
          ...Object.fromEntries(
            candidates.map((candidate) => [
              candidate.id,
              `${candidate.company} — ${candidate.position} (${candidate.status})`,
            ]),
          ),
          none: 'None of the candidates is the application this email is about.',
        },
      },
    },
  );

  const answer = result?.answers.match;
  if (!answer || answer.type !== 'choice') return null;

  return decideMatch(answer, new Set(candidates.map((candidate) => candidate.id)));
}
