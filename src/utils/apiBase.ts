export function resolveApiBaseUrl(configuredBaseUrl: string | undefined): string {
  const normalizedBaseUrl = configuredBaseUrl?.trim().replace(/\/+$/, '');
  return normalizedBaseUrl || '/api';
}

export const API_BASE_URL = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL);

export const SUPPORT_API_BASE_URL = resolveApiBaseUrl(
  import.meta.env.VITE_SUPPORT_API_BASE_URL || API_BASE_URL,
);

export const JOB_SEARCH_API_BASE_URL = resolveApiBaseUrl(import.meta.env.VITE_API_URL);
