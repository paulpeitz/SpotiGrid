import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { TokenManager } from '../js/token-manager.js';

/**
 * Feature: session-persistence, Property 7: Authenticated fetch retries exactly once on 401
 *
 * Validates: Requirements 3.1, 3.3, 4.3
 *
 * For any URL and request options, when authenticatedFetch() receives a 401 response
 * and a refresh_token is available, the TokenManager SHALL make exactly one refresh
 * request to the token endpoint. If the refresh succeeds, the original request SHALL
 * be retried exactly once with the new access_token in the Authorization header.
 */
describe('Feature: session-persistence, Property 7: Authenticated fetch retries exactly once on 401', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('authenticatedFetch retries exactly once on 401 with refreshed token', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.webUrl(),
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        async (url, initialAccessToken, refreshToken, newAccessToken) => {
          localStorage.clear();

          const tm = new TokenManager({ clientId: 'test-client-id' });
          tm._accessToken = initialAccessToken;
          tm._refreshToken = refreshToken;

          let callCount = 0;

          const mockFetch = vi.fn(async (fetchUrl, fetchOptions) => {
            callCount++;

            if (callCount === 1) {
              // 1st call: original API request returns 401
              return new Response(null, { status: 401 });
            }

            if (callCount === 2) {
              // 2nd call: refresh token request returns 200 with new token
              return new Response(
                JSON.stringify({
                  access_token: newAccessToken,
                  token_type: 'Bearer',
                  expires_in: 3600,
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
              );
            }

            if (callCount === 3) {
              // 3rd call: retried API request returns 200
              return new Response(JSON.stringify({ ok: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              });
            }

            // Should never reach here
            return new Response(null, { status: 500 });
          });

          vi.stubGlobal('fetch', mockFetch);

          const response = await tm.authenticatedFetch(url);

          // Assert 1: fetch was called exactly 3 times (original + refresh + retry)
          expect(mockFetch).toHaveBeenCalledTimes(3);

          // Assert 2: The 2nd call was to the Spotify token endpoint (the refresh)
          const secondCallUrl = mockFetch.mock.calls[1][0];
          expect(secondCallUrl).toBe('https://accounts.spotify.com/api/token');

          // Assert 3: The 3rd call has Authorization: Bearer {newAccessToken} header
          const thirdCallOptions = mockFetch.mock.calls[2][1];
          expect(thirdCallOptions.headers.Authorization).toBe(`Bearer ${newAccessToken}`);

          // The final response should be the successful retry
          expect(response.status).toBe(200);
        }
      ),
      { numRuns: 100 }
    );
  });
});
