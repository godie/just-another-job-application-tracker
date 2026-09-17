import { askJudgments } from './aiJudgments';
import { MATCH_AUTO_CONFIDENCE, MATCH_REVIEW_CONFIDENCE } from './applicationMatch';

/**
 * Map the headers of an imported CSV (or a Google Sheets export) onto this
 * app's fields.
 *
 * Canonical names resolve deterministically — that is what our own export
 * writes, so a round trip never touches the model. Everything else goes into
 * ONE batched request with a Choice per column, and a column whose answer is
 * not confident enough is reported back so the UI can ask for it instead of
 * silently dropping data.
 */

export const CANONICAL_CSV_FIELDS = [
  'id',
  'position',
  'company',
  'location',
  'workType',
  'hybridDaysInOffice',
  'salary',
  'status',
  'applicationDate',
  'interviewDate',
  'followUpDate',
  'notes',
  'link',
  'platform',
  'contactName',
  'timeline',
  'customFields',
] as const;

export type CanonicalCsvField = (typeof CANONICAL_CSV_FIELDS)[number];

/**
 * Fields a judgment may map a column to. `id` is deliberately excluded: the
 * record identity must not be adopted from a foreign file, because the import
 * de-duplicates by id and a collision would silently drop rows. An exact `id`
 * header (our own export) still round-trips.
 */
export const JUDGMENT_CSV_FIELDS = CANONICAL_CSV_FIELDS.filter(
  (field): field is Exclude<CanonicalCsvField, 'id'> => field !== 'id',
);

const FIELD_HINTS: Record<CanonicalCsvField, string> = {
  id: 'Internal record identifier',
  position: 'Job title or role name',
  company: 'Employer or company name',
  location: 'City, region or country of the job',
  workType: 'Remote, hybrid or on-site',
  hybridDaysInOffice: 'Number of office days per week when hybrid',
  salary: 'Pay or salary range',
  status: 'Application status such as applied, interviewing, offer, rejected',
  applicationDate: 'Date the application was sent',
  interviewDate: 'Date of the next interview',
  followUpDate: 'Date to follow up',
  notes: 'Free-text notes',
  link: 'URL of the job posting',
  platform: 'Where the application was made (LinkedIn, Indeed, email...)',
  contactName: 'Name of the recruiter or contact person',
  timeline: 'JSON array of interview events',
  customFields: 'JSON object of user-defined fields',
};

type ColumnMappingVerdict = 'exact' | 'auto' | 'review' | 'unmapped';

export interface ColumnMapping {
  index: number;
  header: string;
  field: CanonicalCsvField | null;
  verdict: ColumnMappingVerdict;
  confidence: number;
}

export interface ResolvedCsvColumns {
  /** Index → field to write, or null to skip the column. */
  fields: (CanonicalCsvField | null)[];
  /** Headers mapped by the judgment with review-level confidence. */
  review: string[];
  /** Headers the judgment did not map to any field (or that nobody resolved). */
  unmapped: string[];
  /** Header → resolved field, for callers that want the detail. */
  mappings: ColumnMapping[];
}

/** Exact, case-insensitive match against the canonical field names. */
export function matchCanonicalField(header: string): CanonicalCsvField | null {
  const normalized = header.trim().toLowerCase();
  return (
    CANONICAL_CSV_FIELDS.find((field) => field.toLowerCase() === normalized) ?? null
  );
}

interface ChoiceLike {
  choice: string;
  confidence: number;
}

/**
 * One request for every unresolved header. Returns an empty map when the
 * judgment is unavailable so the caller keeps the exact matches.
 */
async function mapCsvHeadersWithJudgment(
  headers: string[],
): Promise<Map<number, ColumnMapping>> {
  const mappings = new Map<number, ColumnMapping>();
  if (headers.length === 0) return mappings;

  const criteria = Object.fromEntries([
    ...JUDGMENT_CSV_FIELDS.map((field) => [field, FIELD_HINTS[field]]),
    ['ignore', 'None of the fields fits this column, or the column carries no usable data.'],
  ]);

  const questions = Object.fromEntries(
    headers.map((header, index) => [
      `column_${index}`,
      {
        type: 'choice' as const,
        instructions: `Which field of a job-application record does the CSV column "${header}" contain?`,
        criteria,
      },
    ]),
  );

  const result = await askJudgments({ csv_headers: headers }, questions);
  if (!result) return mappings;

  headers.forEach((header, index) => {
    const answer = result.answers[`column_${index}`];
    if (!answer || answer.type !== 'choice') return;
    mappings.set(index, mapColumnAnswer(index, header, answer));
  });

  return mappings;
}

/** Apply the confidence gates to one column answer. */
export function mapColumnAnswer(
  index: number,
  header: string,
  answer: ChoiceLike,
): ColumnMapping {
  const known = JUDGMENT_CSV_FIELDS as readonly string[];
  const unmapped: ColumnMapping = {
    index,
    header,
    field: null,
    verdict: 'unmapped',
    confidence: answer.confidence,
  };

  if (!known.includes(answer.choice)) return unmapped;
  if (answer.confidence < MATCH_REVIEW_CONFIDENCE) return unmapped;

  return {
    index,
    header,
    field: answer.choice as CanonicalCsvField,
    verdict: answer.confidence >= MATCH_AUTO_CONFIDENCE ? 'auto' : 'review',
    confidence: answer.confidence,
  };
}

/**
 * Full resolution: canonical headers first, then one judgment request for the
 * rest. Never throws — a missing judgment service degrades to "only the
 * canonical headers are imported".
 */
export async function resolveCsvColumns(headers: string[]): Promise<ResolvedCsvColumns> {
  const mappings: ColumnMapping[] = headers.map((header, index) => {
    const exact = matchCanonicalField(header);
    return {
      index,
      header,
      field: exact,
      verdict: exact ? 'exact' : 'unmapped',
      confidence: exact ? 1 : 0,
    };
  });

  const unresolved = mappings.filter((mapping) => mapping.field === null);
  if (unresolved.length > 0) {
    const judged = await mapCsvHeadersWithJudgment(unresolved.map((mapping) => mapping.header));
    judged.forEach((mapping, position) => {
      const target = unresolved[position];
      mappings[target.index] = { ...mapping, index: target.index, header: target.header };
    });
  }

  return {
    fields: mappings.map((mapping) => mapping.field),
    review: mappings.filter((mapping) => mapping.verdict === 'review').map((m) => m.header),
    unmapped: mappings.filter((mapping) => mapping.field === null).map((m) => m.header),
    mappings,
  };
}
