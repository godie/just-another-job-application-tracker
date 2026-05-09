// src/types/jobSearch.ts

/**
 * Parameters sent to the job search API.
 */
export interface JobSearchParams {
  keywords: string;
  location?: string;
  remoteOnly: boolean;
  source: JobSearchSource;
  techStack: string[];
  page: number;
  pageSize: number;
}

/**
 * Unified job result returned by the PHP proxy,
 * normalized from Jooble, TheirStack, Adzuna, and Careerjet responses.
 */
export interface UnifiedJobResult {
  id: string;                // "{source}_" + sha256(normalizeUrl(url)).slice(0,12)
  position: string;
  company: string;
  location?: string | null;
  remote: boolean;
  salary?: string | null;
  description?: string | null;  // truncated to 1000 chars
  url: string;
  postedDate?: string | null;   // ISO date
  source: 'jooble' | 'theirstack' | 'adzuna' | 'careerjet';
  techStack: string[];          // tech stack slugs (TheirStack), empty for Jooble
}

/**
 * Response from the PHP proxy endpoint.
 */
export interface JobSearchResponse {
  results: UnifiedJobResult[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  errors: Array<{ source: string; message: string }>;
}

/**
 * Possible error types from the job search proxy.
 */
export type JobSearchError =
  | { error: 'keywords_required'; message: string }
  | { error: 'keywords_too_long'; message: string }
  | { error: 'invalid_source'; message: string }
  | { error: 'not_configured'; message: string }
  | { error: 'upstream_error'; message: string }
  | { error: 'rate_limited'; message: string; retryAfter?: number }
  | { error: 'network_error'; message: string }
  | { error: 'auth_required'; message: string };

/** Source filter type for job search */
export type JobSearchSource = 'jooble' | 'theirstack' | 'adzuna' | 'careerjet' | 'both' | 'all';
