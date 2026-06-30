import { describe, it, expect, vi, beforeEach } from 'vitest';

import { searchJobs } from './jobSearchApi';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

const validBaseJob = {
  id: 'jooble_abc123',
  position: 'Senior Engineer',
  company: 'Acme Corp',
  url: 'https://example.com/jobs/123',
  source: 'jooble' as const,
  location: 'Remote',
  remote: true,
  salary: '$120k',
  description: 'Great role',
  postedDate: '2024-01-15',
  techStack: ['React', 'TypeScript'],
};

const validBaseResponse = {
  results: [
    { ...validBaseJob, url: 'https://example.com/jobs/123', source: 'jooble' as const },
  ],
  total: 1,
  page: 1,
  pageSize: 25,
  hasMore: false,
  errors: [],
};

const baseParams = {
  keywords: 'engineer',
  location: '',
  remoteOnly: true,
  source: 'jooble' as const,
  techStack: [],
  page: 1,
  pageSize: 25,
};

describe('searchJobs — security boundary', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(validBaseResponse),
    });
  });

  it('replaces javascript: URLs with # at the boundary', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          ...validBaseResponse,
          results: [
            {
              ...validBaseJob,
              url: 'javascript:alert(document.cookie)',
              source: 'jooble' as const,
            },
          ],
        }),
    });

    const result = await searchJobs(baseParams);
    expect(result.results[0].url).toBe('#');
  });

  it('replaces data:text/html URLs with # at the boundary', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          ...validBaseResponse,
          results: [
            {
              ...validBaseJob,
              url: 'data:text/html,<script>alert(1)</script>',
              source: 'jooble' as const,
            },
          ],
        }),
    });

    const result = await searchJobs(baseParams);
    expect(result.results[0].url).toBe('#');
  });

  it('replaces empty-string URLs with # at the boundary', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          ...validBaseResponse,
          results: [{ ...validBaseJob, url: '', source: 'jooble' as const }],
        }),
    });

    const result = await searchJobs(baseParams);
    expect(result.results[0].url).toBe('#');
  });

  it('accepts ISO dates with timezone offsets', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          ...validBaseResponse,
          results: [
            {
              ...validBaseJob,
              id: 'jooble_utc',
              postedDate: '2024-01-15T10:00:00Z',
            },
            {
              ...validBaseJob,
              id: 'jooble_offset_pos',
              postedDate: '2024-01-15T10:00:00+00:00',
            },
            {
              ...validBaseJob,
              id: 'jooble_offset_neg',
              postedDate: '2024-01-15T10:00:00-05:00',
            },
            {
              ...validBaseJob,
              id: 'jooble_offset_ms',
              postedDate: '2024-01-15T10:00:00.123+02:00',
            },
          ],
        }),
    });

    const result = await searchJobs(baseParams);
    expect(result.results.map((r) => r.id)).toEqual([
      'jooble_utc',
      'jooble_offset_pos',
      'jooble_offset_neg',
      'jooble_offset_ms',
    ]);
  });

  it('preserves https://, mailto:, tel: and root-relative URLs', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          ...validBaseResponse,
          results: [
            {
              ...validBaseJob,
              id: 'jooble_safe1',
              url: 'mailto:hr@example.com',
              source: 'jooble' as const,
            },
            {
              ...validBaseJob,
              id: 'jooble_safe2',
              url: 'tel:+15551234567',
              source: 'jooble' as const,
            },
            {
              ...validBaseJob,
              id: 'jooble_safe3',
              url: '/jobs/123',
              source: 'jooble' as const,
            },
          ],
        }),
    });

    const result = await searchJobs(baseParams);
    expect(result.results.find((j) => j.id === 'jooble_safe1')!.url).toBe(
      'mailto:hr@example.com',
    );
    expect(result.results.find((j) => j.id === 'jooble_safe2')!.url).toBe(
      'tel:+15551234567',
    );
    expect(result.results.find((j) => j.id === 'jooble_safe3')!.url).toBe(
      '/jobs/123',
    );
  });

  it('rejects oversized URLs by dropping the row', async () => {
    const huge = 'https://example.com/' + 'a'.repeat(2048);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          ...validBaseResponse,
          results: [
            { ...validBaseJob, id: 'jooble_safe', url: 'https://example.com', source: 'jooble' as const },
            { ...validBaseJob, id: 'jooble_huge', url: huge, source: 'jooble' as const },
          ],
        }),
    });

    const result = await searchJobs(baseParams);
    expect(result.results.map((r) => r.id)).toEqual(['jooble_safe']);
  });

  it('accepts explicit null on optional fields (location/salary/postedDate)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          ...validBaseResponse,
          results: [
            {
              ...validBaseJob,
              location: null,
              salary: null,
              description: null,
              postedDate: null,
              techStack: [],
              url: 'https://example.com/jobs/123',
              source: 'jooble' as const,
            },
          ],
        }),
    });

    const result = await searchJobs(baseParams);
    expect(result.results[0].location).toBeNull();
    expect(result.results[0].salary).toBeNull();
    expect(result.results[0].postedDate).toBeNull();
    expect(result.results[0].description).toBeNull();
  });

  it('drops rows whose source enum is not allowlisted (keeps siblings)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          ...validBaseResponse,
          results: [
            { ...validBaseJob, id: 'jooble_safe', url: 'https://example.com', source: 'jooble' as const },
            { ...validBaseJob, id: 'evil_board', url: 'https://example.com', source: 'evil-board' as never },
          ],
        }),
    });

    const result = await searchJobs(baseParams);
    expect(result.results.map((r) => r.id)).toEqual(['jooble_safe']);
  });

  it('drops rows whose techStack exceeds the item cap', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          ...validBaseResponse,
          results: [
            {
              ...validBaseJob,
              id: 'jooble_bloated',
              url: 'https://example.com/jobs/1',
              source: 'jooble' as const,
              techStack: Array.from({ length: 51 }, (_, i) => `t${i}`),
            },
            {
              ...validBaseJob,
              id: 'jooble_ok',
              url: 'https://example.com/jobs/2',
              source: 'jooble' as const,
              techStack: ['React'],
            },
          ],
        }),
    });

    const result = await searchJobs(baseParams);
    expect(result.results.map((r) => r.id)).toEqual(['jooble_ok']);
  });

  it('caps the results array at MAX_RESULTS (100) without throwing', async () => {
    const overflow = Array.from({ length: 150 }, (_, i) => ({
      ...validBaseJob,
      id: `jooble_bulk_${i}`,
      url: `https://example.com/jobs/${i}`,
      source: 'jooble' as const,
    }));
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ...validBaseResponse, results: overflow }),
    });

    const result = await searchJobs(baseParams);
    expect(result.results).toHaveLength(100);
  });

  it('rejects responses with a missing or non-numeric total', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          ...validBaseResponse,
          total: 'a lot', // typeof number required
        }),
    });

    await expect(searchJobs(baseParams)).rejects.toMatchObject({
      error: 'network_error',
    });
  });

  it('rejects responses whose postedDate is not ISO 8601', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          ...validBaseResponse,
          results: [
            { ...validBaseJob, postedDate: 'Sun Jan 15 2024', source: 'jooble' as const },
          ],
        }),
    });

    const result = await searchJobs(baseParams);
    expect(result.results).toHaveLength(0);
  });

  it('trims surrounding whitespace from position/company before validation', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          ...validBaseResponse,
          results: [
            {
              ...validBaseJob,
              position: '  Senior Engineer  ',
              company: '\tAcme Corp\n',
              source: 'jooble' as const,
            },
          ],
        }),
    });

    const result = await searchJobs(baseParams);
    expect(result.results[0].position).toBe('Senior Engineer');
    expect(result.results[0].company).toBe('Acme Corp');
  });

  it('passes through a fully valid response unchanged', async () => {
    const result = await searchJobs(baseParams);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].url).toBe('https://example.com/jobs/123');
    expect(result.total).toBe(1);
    expect(result.hasMore).toBe(false);
    expect(result.errors).toEqual([]);
  });

  it('surfaces partial per-source errors via the typed errors array', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          ...validBaseResponse,
          errors: [{ source: 'adzuna', message: 'rate limit hit' }],
        }),
    });

    const result = await searchJobs(baseParams);
    expect(result.errors).toEqual([{ source: 'adzuna', message: 'rate limit hit' }]);
  });
});
