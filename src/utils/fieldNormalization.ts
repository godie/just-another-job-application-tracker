import type { WorkType } from '../types/applications';
import { askJudgments } from './aiJudgments';
import { MATCH_REVIEW_CONFIDENCE } from './applicationMatch';

/**
 * Normalising imported free text into the app's own vocabulary.
 *
 * Code does what code can: alias tables resolve the common work types and the
 * date parser handles ISO, numeric and month-name formats using the user's own
 * date-format preference. TypeSafe is asked only about a work type whose
 * wording is not in the alias table, and its answer is always one of the
 * options the code supplied — when the wording is genuinely ambiguous it
 * answers `unknown` and the caller keeps the value out of the record (and
 * reports it) instead of guessing.
 *
 * A date judgment was measured and dropped: asking the model to pick between
 * the two readings of an ambiguous numeric date was right in half of the
 * Spanish cases, while the user's date-format preference is authoritative and
 * free.
 */

const WORK_TYPE_OPTIONS: readonly string[] = ['remote', 'hybrid', 'on-site', 'unknown'];

const WORK_TYPE_HINTS: Record<string, string> = {
  remote: 'Fully remote / work from home / teletrabajo, even with a country or region qualifier.',
  hybrid: 'Part office, part remote / híbrido / mixto / flexible, including a number of office days.',
  'on-site': 'Office only / presencial / in person, no remote option.',
  unknown: 'The text does not say, or the arrangement is not one of these.',
};

const WORK_TYPE_ALIASES: [RegExp, WorkType][] = [
  [/\b(remote|remoto|teletrabajo|home\s?office|wfh|anywhere|distributed)\b/i, 'remote'],
  [/\b(hybrid|h[ií]brido|mixto|partially remote|blend)\b/i, 'hybrid'],
  [/\b(on-?site|onsite|presencial|in-?person|in office|office-?based)\b/i, 'on-site'],
];

const HYBRID_DAYS = /(\d)\s*(?:d[ií]as?|days?)(?:\s*(?:a|per|por|\/)\s*(?:week|semana))?/i;

/** Deterministic work-type reading; `undefined` leaves it to the judgment. */
export function normalizeWorkType(value: string | undefined | null): WorkType | undefined {
  if (!value) return undefined;
  const text = value.trim();
  if (!text) return undefined;
  for (const [pattern, workType] of WORK_TYPE_ALIASES) {
    if (pattern.test(text)) return workType;
  }
  return undefined;
}

/** Office days per week when the text says so ("Híbrido (3 días)"). */
export function extractHybridDays(value: string | undefined | null): number | undefined {
  if (!value) return undefined;
  const match = value.match(HYBRID_DAYS);
  if (!match) return undefined;
  const days = Number.parseInt(match[1], 10);
  return days >= 1 && days <= 5 ? days : undefined;
}

export interface WorkTypeNormalization {
  workType: WorkType;
  confidence: number;
  source: 'alias' | 'judgment';
  hybridDays?: number;
}

/**
 * Normalise a batch of work-type strings. Alias hits are free; only the rest
 * go into one batched request. Returns a map keyed by the original value.
 */
export async function normalizeWorkTypes(
  values: string[],
): Promise<Map<string, WorkTypeNormalization>> {
  const result = new Map<string, WorkTypeNormalization>();
  const unresolved: string[] = [];

  for (const value of values) {
    const aliased = normalizeWorkType(value);
    if (aliased) {
      result.set(value, {
        workType: aliased,
        confidence: 1,
        source: 'alias',
        hybridDays: aliased === 'hybrid' ? extractHybridDays(value) : undefined,
      });
    } else {
      unresolved.push(value);
    }
  }

  if (unresolved.length === 0) return result;

  const questions = Object.fromEntries(
    unresolved.map((value, index) => [
      `value_${index}`,
      {
        type: 'choice' as const,
        instructions: `How does the job posting arrange its work? The text is "${value}".`,
        criteria: WORK_TYPE_HINTS,
      },
    ]),
  );

  const judged = await askJudgments({ work_type_values: unresolved }, questions);
  if (!judged) return result;

  unresolved.forEach((value, index) => {
    const answer = judged.answers[`value_${index}`];
    if (!answer || answer.type !== 'choice') return;
    if (!WORK_TYPE_OPTIONS.includes(answer.choice)) return;
    if (answer.confidence < MATCH_REVIEW_CONFIDENCE) return;

    const workType = (answer.choice === 'unknown' ? undefined : answer.choice) as WorkType | undefined;
    if (!workType) return;
    result.set(value, {
      workType,
      confidence: answer.confidence,
      source: 'judgment',
      hybridDays: workType === 'hybrid' ? extractHybridDays(value) : undefined,
    });
  });

  return result;
}

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

const pad = (value: number): string => String(value).padStart(2, '0');

function toIso(year: number, month: number, day: number): string | undefined {
  if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return undefined;
  return `${year}-${pad(month)}-${pad(day)}`;
}

export type DayMonthOrder = 'DMY' | 'MDY';

/**
 * Deterministic date parsing for the formats an import carries: ISO, a
 * numeric day/month pair (resolved with the caller's preferred order), and
 * month names in English or Spanish.
 */
export function normalizeDate(
  value: string | undefined | null,
  preferredOrder: DayMonthOrder = 'DMY',
): string | undefined {
  if (!value) return undefined;
  const text = value.trim();
  if (!text) return undefined;

  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return toIso(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const named = text.match(/^(\d{1,2})\s*(?:de\s+)?([a-záéíóúñ]+)\.?\s*(?:de\s+)?(\d{4})$/i);
  if (named) {
    const month = MONTHS[named[2].toLowerCase()];
    if (month) return toIso(Number(named[3]), month, Number(named[1]));
  }
  const namedFirst = text.match(/^([a-záéíóúñ]+)\.?\s+(\d{1,2}),?\s+(\d{4})$/i);
  if (namedFirst) {
    const month = MONTHS[namedFirst[1].toLowerCase()];
    if (month) return toIso(Number(namedFirst[3]), month, Number(namedFirst[2]));
  }

  const numeric = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (numeric) {
    const first = Number(numeric[1]);
    const second = Number(numeric[2]);
    let year = Number(numeric[3]);
    if (year < 100) year += year < 70 ? 2000 : 1900;

    const [day, month] = preferredOrder === 'DMY' ? [first, second] : [second, first];
    return toIso(year, month, day);
  }

  return undefined;
}

