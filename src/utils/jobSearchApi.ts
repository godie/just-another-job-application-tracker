import { z } from 'zod';
import { sanitizeUrl } from './url';
import type {
  JobSearchParams,
  JobSearchResponse,
  JobSearchError,
  UnifiedJobResult,
} from '../types/jobSearch';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

/* -------------------------------------------------------------------------- */
/*  Zod schemas — the only point that decides what enters the SPA.            */
/*                                                                           */
/*  Threat model: providers (Jooble / TheirStack / Adzuna / Careerjet) are  */
/*  third-party and may return malicious or malformed payloads. The schema  */
/*  enforces strict shape, length caps (defense vs. memory DoS) and runs    */
/*  every URL through `sanitizeUrl` so downstream consumers can render      */
/*  `result.url` directly without re-validating. Defense-in-depth at the    */
/*  render site is still encouraged (`JobSearchResults.tsx`).              */
/* -------------------------------------------------------------------------- */

const MAX_TEXT_LEN = 300;
const MAX_DESCRIPTION_LEN = 5000;
const MAX_SALARY_LEN = 200;
const MAX_TECHSTACK_ITEM_LEN = 100;
const MAX_TECHSTACK_ITEMS = 50;
const MAX_ID_LEN = 200;
const MAX_URL_LEN = 2048; // RFC 9110 practical limit
const MAX_LOCATION_LEN = 300;
const MAX_ERROR_LEN = 500;
const MAX_ERROR_SOURCE_LEN = 50;
const MAX_ERRORS = 20;
const MAX_RESULTS = 100; // per page; backend should already cap, this is the DoS backstop

const ISO_DATE_RE =
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:?\d{2})?)?$/;

const JOB_SOURCES = ['jooble', 'theirstack', 'adzuna', 'careerjet'] as const;

const optionalTrimmedText = (max: number) =>
  z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().max(max))
    .nullish();

const requiredTrimmedText = (max: number) =>
  z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1).max(max));

const isoDateString = z
  .string()
  .max(50)
  .refine((s) => ISO_DATE_RE.test(s), { message: 'Invalid ISO date' })
  .nullish();

const unifiedJobResultSchema = z.object({
  id: requiredTrimmedText(MAX_ID_LEN),
  position: requiredTrimmedText(MAX_TEXT_LEN),
  company: requiredTrimmedText(MAX_TEXT_LEN),
  location: optionalTrimmedText(MAX_LOCATION_LEN),
  remote: z.boolean(),
  salary: optionalTrimmedText(MAX_SALARY_LEN),
  description: optionalTrimmedText(MAX_DESCRIPTION_LEN),
  // Run every url through `sanitizeUrl` so the result of safeParse contains a
  // value safe to bind into `href`, pass to `window.open`, or persist as a
  // `JobOpportunity.link`. Anything outside `http(s):|mailto:|tel:|` (or a
  // single-leading-slash relative path) collapses to `'#'`.
  url: z
    .string()
    .max(MAX_URL_LEN)
    .transform((raw) => sanitizeUrl(raw)),
  postedDate: isoDateString,
  source: z.enum(JOB_SOURCES),
  techStack: z
    .array(z.string().max(MAX_TECHSTACK_ITEM_LEN))
    .max(MAX_TECHSTACK_ITEMS)
    .default([]),
});

const jobSearchErrorEntrySchema = z.object({
  source: z.string().max(MAX_ERROR_SOURCE_LEN),
  message: z.string().max(MAX_ERROR_LEN),
});

// Top-level scalar fields only — per-row validation is intentionally handled
// by safeParse+drop (so a single bad row keeps its siblings).
const jobSearchScalarsSchema = z.object({
  total: z.number().int().nonnegative(),
  page: z.number().int().nonnegative(),
  pageSize: z.number().int().positive(),
  hasMore: z.boolean(),
});

const jobSearchErrorsArraySchema = z
  .array(jobSearchErrorEntrySchema)
  .max(MAX_ERRORS);

/**
 * Throws structured `JobSearchError` on failure.
 *
 * Security boundary: every URL in the raw response is routed through
 * `sanitizeUrl` and every other field is shape-checked + length-capped
 * before this function returns. Callers may bind `result.results[i].url`
 * directly into `href` / `window.open` / store-backed links, but should
 * still apply `sanitizeUrl` at the render site as defence in depth.
 */
export async function searchJobs(
  params: JobSearchParams,
): Promise<JobSearchResponse> {
  const url = `${API_BASE}/job-search`;

  let response: Response;

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(params),
    });
  } catch {
    throw {
      error: 'network_error',
      message: 'Unable to reach search service. Check your connection.',
    } satisfies JobSearchError;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401) {
      throw {
        error: 'auth_required',
        message:
          (data as { message?: string })?.message ??
          'Authentication required. Please sign in.',
      } satisfies JobSearchError;
    }

    if (response.status === 429) {
      throw {
        error: 'rate_limited',
        message:
          (data as { message?: string })?.message ?? 'Too many requests.',
        retryAfter: (data as { retryAfter?: number })?.retryAfter,
      } satisfies JobSearchError;
    }

    if (response.status === 502 || response.status === 504) {
      throw {
        error: 'upstream_error',
        message:
          (data as { message?: string })?.message ??
          'Job board API unavailable.',
      } satisfies JobSearchError;
    }

    if (response.status === 503) {
      throw {
        error: 'not_configured',
        message:
          (data as { message?: string })?.message ??
          'Job search API key(s) not configured on server.',
      } satisfies JobSearchError;
    }

    throw {
      error: 'network_error',
      message:
        (data as { message?: string })?.message ??
        'Search failed. Please try again.',
    } satisfies JobSearchError;
  }

  const scalars = jobSearchScalarsSchema.safeParse(data);
  if (!scalars.success) {
    console.error(
      '[jobSearchApi] Top-level fields failed validation:',
      scalars.error.issues,
    );
    throw {
      error: 'network_error',
      message: 'Unexpected response from search service.',
    } satisfies JobSearchError;
  }

  // Per-row drop: a single malformed entry shouldn't kill the whole page.
  // Each row is sanitised (url → sanitizeUrl) and shape/length-checked;
  // invalid rows are logged and discarded.
  const validatedResults: UnifiedJobResult[] = [];
  if (Array.isArray(data.results)) {
    data.results.forEach((raw: unknown, i: number) => {
      const row = unifiedJobResultSchema.safeParse(raw);
      if (row.success) {
        validatedResults.push(row.data);
      } else {
        console.warn(
          `[jobSearchApi] dropping malformed results[${i}]`,
          row.error.issues,
        );
      }
    });
  }

  // Hard cap so a malicious provider cannot wedge the renderer with millions
  // of rows. Backend is expected to enforce its own cap; this is belt+braces.
  if (validatedResults.length > MAX_RESULTS) {
    validatedResults.length = MAX_RESULTS;
  }

  const errorsParsed = jobSearchErrorsArraySchema.safeParse(data.errors ?? []);
  let errors: Array<{ source: string; message: string }>;
  if (errorsParsed.success) {
    errors = errorsParsed.data;
  } else {
    console.warn(
      '[jobSearchApi] errors[] failed validation',
      errorsParsed.error.issues,
    );
    errors = [];
  }

  if (errors.length > 0) {
    console.warn('[jobSearchApi] Partial errors from sources:', errors);
  }

  return {
    results: validatedResults,
    total: scalars.data.total,
    page: scalars.data.page,
    pageSize: scalars.data.pageSize,
    hasMore: scalars.data.hasMore,
    errors,
  };
}
