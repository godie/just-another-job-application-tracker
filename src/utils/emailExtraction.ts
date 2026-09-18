import type { Email } from '../mails/types';
import { askJudgments } from './aiJudgments';
import { MATCH_AUTO_CONFIDENCE, MATCH_REVIEW_CONFIDENCE } from './applicationMatch';

/**
 * Position and company extraction.
 *
 * The regexes here only gather candidates — recall-tuned, over-finding on
 * purpose. TypeSafe then picks which candidate plays the role, and the code
 * copies that candidate verbatim, so the model can never transpose a name or
 * invent one. Anything it cannot pick keeps the adapter's regex result.
 *
 * Candidate quality is the bottleneck (measured: a malformed candidate is
 * answered with high confidence on the wrong span), so the gatherer
 * normalizes, dedupes case-insensitively and caps the option count.
 */

/** 2 questions per email, and a request allows 25. */
export const MAX_EXTRACTION_EMAILS = 10;

const MAX_CANDIDATES = 30;
const MIN_CANDIDATE_LENGTH = 2;
const MAX_CANDIDATE_LENGTH = 60;

/** Words that mark a capitalized run as a job title rather than a company. */
const TITLE_WORDS =
  /\b(?:engineer|developer|designer|manager|analyst|consultant|specialist|architect|scientist|lead|principal|staff|director|intern|trainee|practicante|pasante|ingenier[oa]|desarrollador[a]?|analista|diseñador[a]?|gerente|jefe[a]?|becario[a]?|coordinador[a]?)\b/i;

/**
 * Sender domains that are never the employer. When one of these is used, the
 * local part usually names the employer instead (`moneris@myworkday.com`,
 * `priceline@myworkday.com`), which `companyFromAddress` reads.
 */
const NON_EMPLOYER_DOMAINS =
  /^(?:gmail|googlemail|outlook|hotmail|yahoo|greenhouse|ashbyhq|workday|myworkday|teamtailor|workable|workablemail|candidates|lever|hire|jobvite|smartrecruiters|applytojob|postmark|amazonses|sendgrid|mail|email|notifications|no-?reply|icims|bamboohr|dayforce|hirebridge|onstrider|jobalerts|ziprecruiter|talent|notify|recruiting)$/i;

/**
 * Boilerplate that wraps the employer in a subject or a body phrase:
 * "Thanks for applying to Financeit", "Thank you for applying for the Senior
 * Solutions Engineer", "Your application to join Prolific", "Update on your
 * application with SS&C." Stripping it leaves the name itself as a candidate.
 */
const BOILERPLATE_PREFIX =
  /^(?:re|fwd?|fw)\s*:\s*|^(?:thanks?|thank you)\s+(?:for|again for)\s+(?:applying|your application|your interest in|your application to)\s+(?:to|at|for|join|joining|with)?\s*|^(?:your|the)\s+application\s+(?:to|for|with|at)\s+|^update\s+(?:on|regarding|to)\s+(?:your|the)?\s*(?:application\s+)?(?:with|for|to|at)?\s*|^application\s+(?:status\s+)?update\s+(?:for|with|to|at)?\s*|^(?:update|status)\s*:\s*/i;

/** The employer named in the local part of an ATS/mailer address. */
function companyFromAddress(from: string): string | undefined {
  const match = from.match(/<?([a-z0-9._+-]+)@([a-z0-9-]+)\.[a-z.]+>?/i);
  if (!match) return undefined;
  const [, localPart, domain] = match;
  if (!NON_EMPLOYER_DOMAINS.test(domain)) return undefined;
  const name = localPart.split('+')[0].replace(/[._-]+/g, ' ').trim();
  if (name.length < 3 || /^(?:no|do|donot|auto|noreply|no?reply)$/i.test(name)) return undefined;
  return name;
}

const SEGMENT_SPLIT = /\s*[-–—|:]\s*/;

/** Connectors that glue a title to the rest of a phrase. */
const CONNECTORS =
  /^(?:the|a|an|our|your|this|that|el|la|los|las|un|una|nuestro|nuestra|de|del|para|por|of|for|at|to|in|on|with|y|and|en)$/i;

/**
 * A trailing connector ends the span: either a connector followed by another
 * word ("Backend Engineer en Globex") or a connector on its own
 * ("Ingeniero de Software Senior en").
 */
const CONNECTOR_TAIL =
  /\s+(?:(?:at|en|for|para|de|del|of|with|con|@)\s+[A-ZÁÉÍÓÚÑ][\w.'’-]*|(?:at|en|for|para|de|del|of|with|con))$/;

const stripEdges = (value: string): string =>
  value.replace(/[\s,.;:!?|]+$/, '').replace(/^[\s,.;:!?|]+/, '').trim();

/**
 * Drop leading/trailing connectors and cut a trailing " <connector> <Word>"
 * chunk, so "Ingeniero de Software Senior en" and "Backend Engineer en Globex"
 * both reduce to the role itself.
 */
const cap = (value: string): string => {
  let cleaned = stripEdges(value);
  for (let i = 0; i < 4; i++) {
    const words = cleaned.split(/\s+/);
    if (words.length > 1 && CONNECTORS.test(words[0])) {
      cleaned = stripEdges(words.slice(1).join(' '));
      continue;
    }
    if (CONNECTOR_TAIL.test(cleaned)) {
      cleaned = stripEdges(cleaned.replace(CONNECTOR_TAIL, ''));
      continue;
    }
    break;
  }
  return cleaned;
};

/** Titles buried in a longer phrase, e.g. "Interview invitation for Senior Engineer". */
function titleTails(phrase: string): string[] {
  const tails: string[] = [];
  const words = phrase.split(/\s+/);
  for (let index = 0; index < words.length; index++) {
    if (!TITLE_WORDS.test(words[index])) continue;
    const start = Math.max(0, index - 2);
    tails.push(words.slice(start, index + 1).join(' '));
  }
  return tails;
}

function pushCandidate(list: string[], seen: Set<string>, raw: string): void {
  const value = cap(raw);
  if (value.length < MIN_CANDIDATE_LENGTH || value.length > MAX_CANDIDATE_LENGTH) return;
  const key = value.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  list.push(value);
}

function collectMatches(source: string, pattern: RegExp, into: string[], seen: Set<string>): void {
  for (const match of source.matchAll(pattern)) {
    if (match[1]) pushCandidate(into, seen, match[1]);
  }
}

export interface ExtractionCandidates {
  company: string[];
  position: string[];
}

/** Recall-tuned candidate gathering; see the module comment. */
export function buildExtractionCandidates(email: Email): ExtractionCandidates {
  const company: string[] = [];
  const position: string[] = [];
  const companySeen = new Set<string>();
  const positionSeen = new Set<string>();

  const subject = email.subject ?? '';
  const body = email.body ?? '';
  const from = email.from ?? '';

  // Subject: every segment is a candidate for one of the two roles.
  const subjectSegments = subject.split(SEGMENT_SPLIT).filter(Boolean);
  for (const segment of subjectSegments) {
    const cleaned = cap(segment);
    if (!cleaned) continue;

    // "Thanks for applying to X" / "Update on your application with X" — the
    // tail is the employer, and for a title phrase the tail is the role. Only
    // the tail is kept: the full phrase is what made the model answer
    // "Thanks for applying to Financeit" as a company.
    const tail = cap(
      cleaned.replace(BOILERPLATE_PREFIX, '').replace(/^(?:join|joining|the|our)\s+/i, ''),
    );
    if (tail && tail !== cleaned) {
      if (TITLE_WORDS.test(tail)) {
        for (const titleTail of titleTails(tail)) pushCandidate(position, positionSeen, titleTail);
        pushCandidate(position, positionSeen, tail);
      } else {
        pushCandidate(company, companySeen, tail);
      }
      continue;
    }

    if (TITLE_WORDS.test(cleaned)) {
      // The clean role first, then the full phrase as a fallback candidate.
      for (const tail of titleTails(cleaned)) pushCandidate(position, positionSeen, tail);
      pushCandidate(position, positionSeen, cleaned);
    } else {
      pushCandidate(company, companySeen, cleaned);
    }
  }

  // Body: "at/to/for/en X" phrases are company candidates.
  collectMatches(
    body,
    /\b(?:at|to|en|for|with|@)\s+([A-ZÁÉÍÓÚÑ][\w&.'’-]*(?:\s+[A-ZÁÉÍÓÚÑ][\w&.'’-]*){0,3})/g,
    company,
    companySeen,
  );

  // Body: explicit position phrases.
  collectMatches(
    body,
    /\b(?:role|position|puesto|vacante|posición|cargo)\s+(?:of|for|de|para)\s+([A-Za-zÁÉÍÓÚÑ][\w&./’+-]*(?:\s+[A-Za-zÁÉÍÓÚÑ][\w&./’+-]*){0,4})/gi,
    position,
    positionSeen,
  );
  collectMatches(
    body,
    /\b(?:postulaci[oó]n|application)\s+(?:para|for)\s+(?:el\s+|la\s+|the\s+)?(?:puesto\s+|role\s+)?(?:de\s+|of\s+)?([A-Za-zÁÉÍÓÚÑ][\w&./’+-]*(?:\s+[A-Za-zÁÉÍÓÚÑ][\w&./’+-]*){0,4})/gi,
    position,
    positionSeen,
  );

  // Body: any capitalized run whose words include a title word, plus the
  // title-anchored tail of that run ("...role at Acme" is not a title).
  for (const match of body.matchAll(/\b([A-ZÁÉÍÓÚÑ][\w&./’+-]*(?:\s+[A-ZÁÉÍÓÚÑ][\w&./’+-]*){0,4})\b/g)) {
    if (!match[1] || !TITLE_WORDS.test(match[1])) continue;
    for (const tail of titleTails(cap(match[1]))) pushCandidate(position, positionSeen, tail);
    pushCandidate(position, positionSeen, match[1]);
  }

  // The first non-empty line of the body names the employer in Workable,
  // BambooHR and similar application copies ("Financeit", "Providius"). A
  // greeting or a quoted line is not a name.
  const firstLine = body
    .split(/\r?\n/)
    .map((line) => cap(line))
    .find((line) => line.length > 2 && line.length <= MAX_CANDIDATE_LENGTH);
  if (
    firstLine &&
    !TITLE_WORDS.test(firstLine) &&
    !/^(?:hi|hello|hey|dear|hola|estimado|estimada|buenas|greetings)\b/i.test(firstLine) &&
    !/^[>[\]-]/.test(firstLine) &&
    !/^[-=_*\s]+$/.test(firstLine)
  ) {
    pushCandidate(company, companySeen, firstLine);
  }

  // Sender display name and domain.
  const displayName = from.match(/^\s*"?([^"<]+?)"?\s*</);
  if (displayName?.[1]) {
    const name = cap(displayName[1]);
    if (TITLE_WORDS.test(name)) {
      pushCandidate(position, positionSeen, name);
    } else {
      pushCandidate(company, companySeen, name);
    }
  }
  const domain = from.match(/@([a-z0-9-]+)\./i);
  if (domain?.[1] && !NON_EMPLOYER_DOMAINS.test(domain[1])) {
    pushCandidate(company, companySeen, domain[1]);
  }
  const fromAddress = companyFromAddress(from);
  if (fromAddress) pushCandidate(company, companySeen, fromAddress);

  return {
    company: company.slice(0, MAX_CANDIDATES),
    position: position.slice(0, MAX_CANDIDATES),
  };
}

type ExtractionVerdict = 'auto' | 'review' | 'none';

export interface ExtractionDecision {
  company?: string;
  position?: string;
  verdict: ExtractionVerdict;
  confidence: number;
}

export interface EmailExtraction extends ExtractionDecision {
  emailId: string;
}

function accepted(
  answer: { choice: string; confidence: number } | undefined,
  candidates: string[],
): { value?: string; confidence: number } {
  if (!answer || answer.choice === 'none') return { confidence: answer?.confidence ?? 0 };
  const picked = candidates.find((candidate) => candidate.toLowerCase() === answer.choice.toLowerCase());
  if (!picked) return { confidence: answer.confidence };
  if (answer.confidence < MATCH_REVIEW_CONFIDENCE) return { confidence: answer.confidence };
  return { value: picked, confidence: answer.confidence };
}

/** Combine the two answers into one decision (code copies the candidate). */
export function decideExtraction(
  companyAnswer: { choice: string; confidence: number } | undefined,
  positionAnswer: { choice: string; confidence: number } | undefined,
  candidates: ExtractionCandidates,
): ExtractionDecision {
  const company = accepted(companyAnswer, candidates.company);
  const position = accepted(positionAnswer, candidates.position);

  const confidences = [company.confidence, position.confidence].filter((value) => value > 0);
  const confidence = confidences.length > 0 ? Math.min(...confidences) : 0;
  const picked = company.value !== undefined || position.value !== undefined;

  if (!picked) return { verdict: 'none', confidence };
  return {
    company: company.value,
    position: position.value,
    verdict: confidence >= MATCH_AUTO_CONFIDENCE ? 'auto' : 'review',
    confidence,
  };
}

/**
 * One batched request for a scan: two Choice questions per email (`company`
 * and `position`) over that email's own candidate lists. Returns an empty map
 * when the judgment is unavailable.
 */
export async function extractWithJudgment(
  emails: Email[],
): Promise<Map<number, EmailExtraction>> {
  const extractions = new Map<number, EmailExtraction>();
  const batch = emails.slice(0, MAX_EXTRACTION_EMAILS);
  if (batch.length === 0) return extractions;

  const candidates = batch.map((email) => buildExtractionCandidates(email));
  const criteriaFor = (values: string[]) =>
    Object.fromEntries([
      ...values.map((value) => [value, null]),
      ['none', 'No candidate fits.'],
    ]);

  const questions: Record<string, unknown> = {};
  batch.forEach((_, index) => {
    questions[`email_${index}_company`] = {
      type: 'choice',
      instructions: `Which of \`emails[${index}].candidates.company\` is the employer this email is about? Ignore job boards and ATS senders (greenhouse, workday, ...) when the employer is named. Answer none when none fits.`,
      criteria: criteriaFor(candidates[index].company),
    };
    questions[`email_${index}_position`] = {
      type: 'choice',
      instructions: `Which of \`emails[${index}].candidates.position\` is the job title this email is about? Answer none when none fits.`,
      criteria: criteriaFor(candidates[index].position),
    };
  });

  const result = await askJudgments(
    { emails: batch.map((email, index) => ({ subject: email.subject, from: email.from, body: email.body, candidates: candidates[index] })) },
    questions as Parameters<typeof askJudgments>[1],
  );
  if (!result) return extractions;

  batch.forEach((email, index) => {
    const companyAnswer = result.answers[`email_${index}_company`];
    const positionAnswer = result.answers[`email_${index}_position`];
    const company = companyAnswer?.type === 'choice' ? companyAnswer : undefined;
    const position = positionAnswer?.type === 'choice' ? positionAnswer : undefined;
    if (!company && !position) return;

    extractions.set(index, {
      emailId: email.id,
      ...decideExtraction(company, position, candidates[index]),
    });
  });

  return extractions;
}
