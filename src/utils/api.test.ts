import { describe, it, expect, vi, beforeEach } from 'vitest';
import { linkGoogleAccount } from './api';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe('linkGoogleAccount', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('calls fetch with correct method, body and credentials', async () => {
    const mockResponse = {
      json: vi.fn().mockResolvedValue({ success: true, user: null }),
    };
    mockFetch.mockResolvedValue(mockResponse);

    await linkGoogleAccount('auth-code-123', 'http://localhost:5173');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];

    expect(url).toMatch(/\/api\/auth\/google$/);
    expect(options.method).toBe('POST');
    expect(options.credentials).toBe('include');
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(options.body).toBe(JSON.stringify({ googleToken: 'auth-code-123', redirectUri: 'http://localhost:5173' }));
  });

  it('returns the JSON response without modification for success', async () => {
    const responseData = {
      success: true,
      user: { id: 1, email: 'test@example.com', role: 'member', isPublic: false },
      message: 'Google account linked successfully',
    };
    mockFetch.mockResolvedValue({
      json: vi.fn().mockResolvedValue(responseData),
    });

    const result = await linkGoogleAccount('auth-code-456', 'http://localhost:5173');

    expect(result).toEqual(responseData);
  });

  it('returns the JSON response for a failure response', async () => {
    const errorData = {
      success: false,
      error: 'Esta cuenta de Google ya está vinculada a otro usuario',
    };
    mockFetch.mockResolvedValue({
      json: vi.fn().mockResolvedValue(errorData),
    });

    const result = await linkGoogleAccount('conflict-code', 'http://localhost:5173');

    expect(result).toEqual(errorData);
  });
});
