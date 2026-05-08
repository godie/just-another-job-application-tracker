// src/utils/jobSearchApi.ts

import type { JobSearchParams, JobSearchResponse, JobSearchError } from '../types/jobSearch';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

/**
 * Fetch job search results via the PHP proxy endpoint.
 * Supports Jooble, TheirStack, or both sources in parallel.
 * Sends session cookie for authentication (credentials: 'include').
 *
 * Throws structured JobSearchError on failure.
 */
export async function searchJobs(params: JobSearchParams): Promise<JobSearchResponse> {
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
    // Map HTTP status codes to structured errors
    if (response.status === 401) {
      throw {
        error: 'auth_required',
        message: (data as { message?: string })?.message ?? 'Authentication required. Please sign in.',
      } satisfies JobSearchError;
    }

    if (response.status === 429) {
      throw {
        error: 'rate_limited',
        message: (data as { message?: string })?.message ?? 'Too many requests.',
        retryAfter: (data as { retryAfter?: number })?.retryAfter,
      } satisfies JobSearchError;
    }

    if (response.status === 502 || response.status === 504) {
      throw {
        error: 'upstream_error',
        message: (data as { message?: string })?.message ?? 'Job board API unavailable.',
      } satisfies JobSearchError;
    }

    if (response.status === 503) {
      throw {
        error: 'not_configured',
        message: (data as { message?: string })?.message ?? 'Job search API key(s) not configured on server.',
      } satisfies JobSearchError;
    }

    throw {
      error: 'network_error',
      message: (data as { message?: string })?.message ?? 'Search failed. Please try again.',
    } satisfies JobSearchError;
  }

  if (!data || !Array.isArray(data.results)) {
    throw {
      error: 'network_error',
      message: 'Unexpected response from search service.',
    } satisfies JobSearchError;
  }

  // Surface partial errors from individual sources (e.g., TheirStack failed but Jooble succeeded)
  const result = data as JobSearchResponse;
  if (result.errors && result.errors.length > 0) {
    // Don't throw — results are still returned. Errors are displayed inline.
    console.warn('[jobSearchApi] Partial errors from sources:', result.errors);
  }

  return result;
}
