import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { TokenManager } from '../js/token-manager.js';

/**
 * Feature: session-persistence, Property 5: Restore valid token without network request
 *
 * Validates: Requirements 2.1
 *
 * For any stored session where the access_token is a non-empty string and the stored
 * expiresAt is in the future (greater than current time), calling restore() SHALL return
 * a SessionData object containing that access_token without making any network requests
 * (fetch not called).
 */
describe('Feature: session-persistence, Property 5: Restore valid token without network request', () => {
  let fetchSpy;

  beforeEach(() => {
    localStorage.clear();
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('restore() returns stored access_token without calling fetch when token is not expired', async () => {
    const accessTokenArb = fc.string({ minLength: 1 });
    const refreshTokenArb = fc.option(fc.string({ minLength: 1 }), { nil: null });
    const timeToExpireArb = fc.integer({ min: 5000, max: 86400000 });

    await fc.assert(
      fc.asyncProperty(accessTokenArb, refreshTokenArb, timeToExpireArb, async (accessToken, refreshToken, timeToExpire) => {
        localStorage.clear();
        fetchSpy.mockClear();

        // Store values directly in localStorage under spotigrid_* keys
        const expiresAt = Date.now() + timeToExpire;
        localStorage.setItem('spotigrid_access_token', accessToken);
        if (refreshToken !== null) {
          localStorage.setItem('spotigrid_refresh_token', refreshToken);
        }
        localStorage.setItem('spotigrid_token_expires_at', String(expiresAt));

        const tm = new TokenManager({ clientId: 'test-client-id' });

        // Call restore
        const result = await tm.restore();

        // Assert: result contains the stored access_token
        expect(result).not.toBeNull();
        expect(result.accessToken).toBe(accessToken);

        // Assert: fetch was NOT called (no network request)
        expect(fetchSpy).not.toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  });
});
