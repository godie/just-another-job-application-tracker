import { z } from 'zod';

import { sanitizeUrl } from './url';
import type { JobApplication } from '../types/applications';
import type { JobOpportunity } from '../types/opportunities';

/* -------------------------------------------------------------------------- */
/*  Sync boundary hardening.                                                 */
/*                                                                           */
/*  Threat model: GET /api/sync/* returns rows owned by the calling user,   */
/*  but the response is still attacker-influenced — compromised server,     */
/*  MITM, or stale cache. We treat every entry as untrusted: length caps,   */
/*  strict enums, and `link` is sanitised through `sanitizeUrl` so the      */
/*  store cannot carry a `javascript:` payload into <a href> sinks.        */
/* -------------------------------------------------------------------------- */

const MAX_TEXT = 300;
const MAX_NOTES = 5000;
const MAX_DESCRIPTION = 5000;
const MAX_SALARY = 200;
const MAX_URL = 2048; // RFC 9110 practical limit
const MAX_CUSTOM_KEY_LEN = 50;
const MAX_CUSTOM_VALUE = 1000;
const MAX_CUSTOM_KEYS = 50; // maximum number of custom fields per application
const MAX_TIMELINE_EVENTS = 200;
const MAX_ENTITIES = 1000; // per response; backend is expected to paginate

const ISO_DATE_RE =
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:?\d{2})?)?$/;

// ids in this codebase are app-generated; alphanumeric + dashes + underscores
// only. Anything else is hostile (proto-pollution attempts, SQL-injection CSV
// cruft, etc.).
const ID_RE = /^[A-Za-z0-9_-]{1,200}$/;

const INTERVIEW_STAGE_TYPES = [
  'application_submitted',
  'screener_call',
  'first_contact',
  'technical_interview',
  'code_challenge',
  'live_coding',
  'hiring_manager',
  'system_design',
  'cultural_fit',
  'final_round',
  'offer',
  'rejected',
  'withdrawn',
  'custom',
] as const;

const EVENT_STATUSES = ['completed', 'scheduled', 'cancelled', 'pending'] as const;
const WORK_TYPES = ['remote', 'on-site', 'hybrid'] as const;

/**
 * Optional scalar (or object) whose output type is `T | undefined` — null is
 * coerced to undefined so the parsed shape matches the `field?: T` style used
 * throughout the TS interfaces (`JobApplication`, `JobOpportunity`).
 */
const optional = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v == null ? undefined : v), schema.optional());

const optionalText = (max: number) => optional(z.string().max(max));
const optionalEnum = <U extends string>(values: readonly U[]) =>
  optional(z.enum(values as unknown as [U, ...U[]]));
const optionalDate = () =>
  optional(
    z
      .string()
      .max(50)
      .refine((s) => ISO_DATE_RE.test(s), { message: 'Invalid ISO date' }),
  );

const interviewEventSchema = z.object({
  id: z.string().regex(ID_RE, { message: 'Invalid id format' }),
  type: z.enum(INTERVIEW_STAGE_TYPES),
  // ISO date or empty string (current data model allows empty interview-date).
  date: z
    .string()
    .max(50)
    .refine((s) => s === '' || ISO_DATE_RE.test(s), {
      message: 'Invalid ISO date',
    }),
  notes: optionalText(MAX_TEXT),
  status: z.enum(EVENT_STATUSES),
  customTypeName: optionalText(MAX_TEXT),
  interviewerName: optionalText(MAX_TEXT),
});

/**
 * Custom field map (≤ MAX_CUSTOM_KEYS keys, each ≤ MAX_CUSTOM_KEY_LEN chars,
 * each value ≤ MAX_CUSTOM_VALUE chars). Accepts absent / null / object. The
 * preprocess MUST run BEFORE the record/refine validation, otherwise an absent
 * `customFields` value (the common case for legacy rows) is rejected by
 * `z.record(…)` before optionality can kick in.
 */
const customFieldsSchema = (() => {
  const record = z.record(
    z.string().max(MAX_CUSTOM_KEY_LEN),
    z.string().max(MAX_CUSTOM_VALUE),
  ).refine(
    (obj) => Object.keys(obj).length <= MAX_CUSTOM_KEYS,
    { message: `Too many custom fields (max ${MAX_CUSTOM_KEYS})` },
  );
  return optional(record);
})();

export const jobApplicationSchema = z.object({
  id: z.string().regex(ID_RE, { message: 'Invalid id format' }),
  position: z.string().trim().min(1).max(MAX_TEXT),
  company: z.string().trim().min(1).max(MAX_TEXT),
  location: optionalText(MAX_TEXT),
  workType: optionalEnum(WORK_TYPES),
  hybridDaysInOffice: optional(z.number().int().min(0).max(7)),
  salary: z.string().max(MAX_SALARY),
  status: z.string().max(100),
  // applicationDate/interviewDate are allowed to be empty strings in current data
  applicationDate: z
    .string()
    .max(50)
    .refine((s) => s === '' || ISO_DATE_RE.test(s), { message: 'Invalid ISO date' }),
  interviewDate: z.string().max(50),
  timeline: z.array(interviewEventSchema).max(MAX_TIMELINE_EVENTS).default([]),
  notes: z.string().max(MAX_NOTES),
  link: z.string().max(MAX_URL).transform((raw) => sanitizeUrl(raw)),
  platform: z.string().max(MAX_TEXT),
  contactName: z.string().max(MAX_TEXT),
  followUpDate: z.string().max(50),
  customFields: customFieldsSchema,
});

export const jobOpportunitySchema = z.object({
  id: z.string().regex(ID_RE, { message: 'Invalid id format' }),
  position: z.string().trim().min(1).max(MAX_TEXT),
  company: z.string().trim().min(1).max(MAX_TEXT),
  link: z.string().max(MAX_URL).transform((raw) => sanitizeUrl(raw)),
  description: optionalText(MAX_DESCRIPTION),
  location: optionalText(MAX_TEXT),
  jobType: optionalText(MAX_TEXT),
  salary: optionalText(MAX_SALARY),
  postedDate: optionalDate(),
  capturedDate: z
    .string()
    .max(50)
    .refine((s) => ISO_DATE_RE.test(s), { message: 'Invalid ISO date' }),
});

/* -------------------------------------------------------------------------- */
/*  Response-shape helpers.                                                  */
/* -------------------------------------------------------------------------- */

export interface ParsedListResult<T> {
  items: T[];
  /** Per-row validation failures (bad shape, bad enum, oversized text, etc.) */
  dropped: number;
  /** Rows beyond MAX_ENTITIES — silently truncated to bound DoS. Not the same
   *  thing as `dropped`: truncated rows are otherwise valid, just beyond the
   *  pull-side cap. */
  truncated: number;
  /** Set when the envelope itself was unparseable, the server said not-success,
   *  or the array key was missing. Caller may surface this to the user. */
  envelopeError: string | null;
}

function parseList<T>(
  raw: unknown,
  resultsKey: 'applications' | 'opportunities',
  schema: z.ZodType<T>,
  context: string,
): ParsedListResult<T> {
  const out: ParsedListResult<T> = {
    items: [],
    dropped: 0,
    truncated: 0,
    envelopeError: null,
  };

  if (raw === null || typeof raw !== 'object') {
    out.envelopeError = `${context}: non-object response`;
    return out;
  }

  const obj = raw as Record<string, unknown>;
  if (obj.success !== true) {
    out.envelopeError = `${context}: success!==true`;
    return out;
  }

  const arr = obj[resultsKey];
  if (!Array.isArray(arr)) {
    // No data is a normal "start fresh" reply, not an error.
    return out;
  }

  for (let i = 0; i < arr.length; i++) {
    const row = schema.safeParse(arr[i]);
    if (row.success) {
      out.items.push(row.data);
    } else {
      console.warn(`[syncSchemas] dropping ${resultsKey}[${i}]`, row.error.issues);
      out.dropped++;
    }
  }

  if (out.items.length > MAX_ENTITIES) {
    out.truncated = out.items.length - MAX_ENTITIES;
    out.items.length = MAX_ENTITIES;
  }
  return out;
}

export function parseApplicationsSyncResponse(raw: unknown): ParsedListResult<JobApplication> {
  return parseList(raw, 'applications', jobApplicationSchema, 'applications sync');
}

export function parseOpportunitiesSyncResponse(raw: unknown): ParsedListResult<JobOpportunity> {
  return parseList(raw, 'opportunities', jobOpportunitySchema, 'opportunities sync');
}

/** JSON parser that swallows `response.json()` parse failures and returns null
 *  (which the schema parsers treat as envelope error). */
export async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
