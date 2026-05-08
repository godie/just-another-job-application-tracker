import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import { linkGoogleAccount } from './api';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe('linkGoogleAccount — property tests', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it(
    'Property: builds correct request for any authorization code (numRuns=100)',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          async (code) => {
            const jsonMock = vi.fn().mockResolvedValue({ success: true });
            mockFetch.mockResolvedValue({ json: jsonMock });

            await linkGoogleAccount(code);

            expect(mockFetch).toHaveBeenCalledTimes(1);
            const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];

            // URL must end with /auth/google (base URL may vary by env)
            expect(url).toMatch(/\/api\/auth\/google$/);
            expect(options.method).toBe('POST');
            expect(options.credentials).toBe('include');
            expect(options.headers).toEqual({ 'Content-Type': 'application/json' });
            expect(options.body).toBe(JSON.stringify({ googleToken: code }));

            mockFetch.mockReset();
          }
        ),
        { numRuns: 100 }
      );
    },
    20000
  );

  it(
    'Property: returns JSON response without transformation (numRuns=100)',
    async () => {
      const authResponseArb = fc.record({
        success: fc.boolean(),
        user: fc.oneof(
          fc.constant(null),
          fc.record({
            id: fc.integer({ min: 1 }),
            email: fc.string({ minLength: 1 }),
            isPublic: fc.boolean(),
            role: fc.constantFrom('member', 'admin'),
            googleId: fc.oneof(fc.constant(null), fc.string({ minLength: 1 })),
            linkedinId: fc.oneof(fc.constant(null), fc.string({ minLength: 1 })),
            displayName: fc.oneof(fc.constant(null), fc.constant(undefined), fc.string()),
            organizationId: fc.oneof(fc.constant(null), fc.constant(undefined), fc.integer({ min: 1 })),
            username: fc.oneof(fc.constant(null), fc.constant(undefined), fc.string()),
            avatarUrl: fc.oneof(fc.constant(null), fc.constant(undefined), fc.string()),
            bio: fc.oneof(fc.constant(null), fc.constant(undefined), fc.string()),
            createdAt: fc.oneof(fc.constant(null), fc.constant(undefined), fc.string()),
            updatedAt: fc.oneof(fc.constant(null), fc.constant(undefined), fc.string()),
            lastLoginAt: fc.oneof(fc.constant(null), fc.constant(undefined), fc.string()),
          })
        ),
        message: fc.oneof(fc.constant(undefined), fc.string({ minLength: 1 })),
        error: fc.oneof(fc.constant(undefined), fc.string({ minLength: 1 })),
      });

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          authResponseArb,
          async (code, responseData) => {
            const jsonMock = vi.fn().mockResolvedValue(responseData);
            mockFetch.mockResolvedValue({ json: jsonMock });

            const result = await linkGoogleAccount(code);

            expect(result).toStrictEqual(responseData);

            mockFetch.mockReset();
          }
        ),
        { numRuns: 100 }
      );
    },
    20000
  );
});
