import { askJudgments } from './aiJudgments';
import { MATCH_AUTO_CONFIDENCE, MATCH_REVIEW_CONFIDENCE } from './applicationMatch';

/**
 * Email classification through a TypeSafe Choice, replacing the keyword
 * cascade in `EmailAdapter.classify` for the cases where wording is not
 * literal. The regex cascade stays as the fallback: any failure (no key,
 * offline, low confidence, unknown option) leaves the deterministic result
 * untouched.
 */

export type EmailEventType = 'application_submitted' | 'next_steps' | 'rejected' | 'offer' | 'other';

export const EMAIL_EVENT_TYPES: readonly EmailEventType[] = [
  'application_submitted',
  'next_steps',
  'rejected',
  'offer',
  'other',
];

/** One request carries this many emails; each email adds one question. */
export const MAX_EMAILS_PER_CLASSIFICATION = 20;

const MAX_SNIPPET_CHARS = 400;

/**
 * Contrastive criteria, per the TypeSafe guidance: what belongs in each
 * option and what belongs in a neighbouring one instead.
 */
export const EMAIL_EVENT_CRITERIA = {
  rejected: {
    what: 'Says the application was rejected, that another candidate was chosen, or that the process will not continue.',
    not_for: 'A neutral status update with no decision, or an invitation to continue.',
  },
  offer: {
    what: 'Makes or discusses a job offer.',
    not_for: 'An interview invitation or a request for more information before deciding.',
  },
  next_steps: {
    what: 'Invites, schedules or describes an interview, screening call, assessment, or the next stage of the process.',
    not_for: 'A mere acknowledgement that the application arrived.',
  },
  application_submitted: {
    what: 'Confirms the application or candidacy was received, with no interview scheduled and no decision yet.',
    not_for: 'Emails that schedule something (interview, call, assessment) or communicate a decision.',
  },
  other: {
    what: 'Anything else: job alerts, newsletters, marketing, unrelated notices.',
    not_for: 'Any email about the progress of one specific application.',
  },
};

type ClassificationVerdict = 'auto' | 'review' | 'none';

export interface ClassificationDecision {
  type: EmailEventType | null;
  verdict: ClassificationVerdict;
  confidence: number;
}

export interface ClassifiableEmail {
  subject: string;
  from?: string;
  body?: string;
}

/**
 * Same gates as the application matching: act on the top-confidence answer,
 * flag the middle band for review, and ignore everything below it so the
 * caller's keyword classification stands.
 */
export function decideEventType(
  choice: { choice: string; confidence: number } | undefined,
): ClassificationDecision {
  const known = EMAIL_EVENT_TYPES as readonly string[];
  if (!choice || !known.includes(choice.choice)) {
    return { type: null, verdict: 'none', confidence: choice?.confidence ?? 0 };
  }

  const type = choice.choice as EmailEventType;
  if (choice.confidence >= MATCH_AUTO_CONFIDENCE) {
    return { type, verdict: 'auto', confidence: choice.confidence };
  }
  if (choice.confidence >= MATCH_REVIEW_CONFIDENCE) {
    return { type, verdict: 'review', confidence: choice.confidence };
  }
  return { type: null, verdict: 'none', confidence: choice.confidence };
}

/**
 * Classify a batch of emails in ONE request: every email becomes one Choice
 * question over the same state, and questions run in parallel. Returns an
 * empty map when the judgment is unavailable.
 */
export async function classifyEmailsWithJudgment(
  emails: ClassifiableEmail[],
): Promise<Map<number, ClassificationDecision>> {
  const decisions = new Map<number, ClassificationDecision>();
  const batch = emails.slice(0, MAX_EMAILS_PER_CLASSIFICATION);
  if (batch.length === 0) return decisions;

  const questions = Object.fromEntries(
    batch.map((_, index) => [
      `email_${index}`,
      {
        type: 'choice' as const,
        instructions: `Which kind of job-application email is \`emails[${index}]\`? Judge only from that email's subject, sender and body.`,
        criteria: EMAIL_EVENT_CRITERIA,
      },
    ]),
  );

  const result = await askJudgments(
    {
      emails: batch.map((email) => ({
        subject: email.subject.slice(0, MAX_SNIPPET_CHARS),
        from: email.from ?? '',
        body: (email.body ?? '').slice(0, MAX_SNIPPET_CHARS),
      })),
    },
    questions,
  );
  if (!result) return decisions;

  batch.forEach((_, index) => {
    const answer = result.answers[`email_${index}`];
    if (answer && answer.type === 'choice') {
      decisions.set(index, decideEventType(answer));
    }
  });

  return decisions;
}
