import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { TokenManager } from '../js/token-manager.js';

/**
 * Feature: session-persistence, Property 8: Request queuing during refresh
 *
 * Validates: Requirements 3.5
 *
 * For any N concurrent calls to authenticatedFetch() that each receive a 401 response
 * while a refresh is in progress, the TokenManager SHALL issue exactly one refresh
 * request (not N). After the refresh succeeds, all N requests SHALL be retried with
 * the same new access_token.
 */
describe('Feature: session-persistence, Property 8: Request queuing during refresh', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('N concurrent authenticatedFetch calls with 401 trigger exactly one refresh and all retries use the same new token', { timeout: 30000 }, async () => {
    const testArb = fc.record({
      n: fc.integer({ min: 2, max: 10 }),
      accessToken: fc.string({ minLength: 5, maxLength: 30 }).filter(s => !s.includes(' ')),
      refreshToken: fc.string({ minLength: 5, maxLength: 30 }).filter(s => !s.includes(' ')),
      newAccessToken: fc.string({ minLength: 5, maxLength: 30 }).filter(s => !s.includes(' ')),
    });

    await fc.assert(
      fc.asyncProperty(testArb, async ({ n, accessToken, refreshToken, newAccessToken }) => {
        localStorage.clear();

        const tm = new TokenManager({ clientId: 'test-client-id' });
        tm._accessToken = accessToken;
        tm._refreshToken = refreshToken;
        tm._expiresAt = Date.now() + 3600000; // Valid expiry

        // Track all fetch calls
        const fetchCalls = [];
        let refreshResolve;
        const refreshGate = new Promise(resolve => { refreshResolve = resolve; });

        vi.stubGlobal('fetch', vi.fn(async (url, opts) => {
          fetchCalls.push({ url, opts });

          // Refresh endpoint - delayed response
          if (url === 'https://accounts.spotify.com/api/token') {
            await refreshGate;
            return {
              ok: true,
              status: 200,
              json: async () => ({
                access_token: newAccessToken,
                refresh_token: refreshToken,
                expires_in: 3600,
              }),
            };
          }

          // API calls with old token → 401
          const authHeader = opts?.headers?.Authorization || '';
          if (authHeader === `Bearer ${accessToken}`) {
            return { ok: false, status: 401 };
          }

          // API calls with new token → 200
          if (authHeader === `Bearer ${newAccessToken}`) {
            return { ok: true, status: 200 };
          }

          // Fallback
          return { ok: false, status: 500 };
        }));

        // Launch N concurrent authenticatedFetch calls
        const apiUrl = 'https://api.spotify.com/v1/me';
        const promises = Array.from({ length: n }, () =>
          tm.authenticatedFetch(apiUrl, {})
        );

        // Allow microtasks to process so all requests hit 401 and queue
        await new Promise(resolve => setTimeout(resolve, 0));

        // Release the refresh gate
        refreshResolve();

        // Wait for all to settle
        const results = await Promise.all(promises);

        // Count refresh calls
        const refreshCalls = fetchCalls.filter(
          c => c.url === 'https://accounts.spotify.com/api/token'
        );

        // Count retry calls (API calls with new token)
        const retryCalls = fetchCalls.filter(
          c => c.url === apiUrl && c.opts?.headers?.Authorization === `Bearer ${newAccessToken}`
        );

        // Assertion 1: Exactly ONE refresh request
        expect(refreshCalls.length).toBe(1);

        // Assertion 2: All N retry requests used the new access token
        expect(retryCalls.length).toBe(n);

        // All results should be successful (status 200)
        for (const result of results) {
          expect(result.status).toBe(200);
        }
      }),
      { numRuns: 50 }
    );
  });
});
