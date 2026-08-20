import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { TokenManager } from '../js/token-manager.js';

/**
 * Feature: session-persistence, Property 3: Partial token storage
 *
 * Validates: Requirements 1.4
 *
 * For any token response where refresh_token or expires_in is absent (undefined/null),
 * the TokenManager SHALL store only the fields that are present. Specifically:
 * - if refresh_token is absent, `localStorage.getItem('spotigrid_refresh_token')` SHALL return null
 * - if expires_in is absent, `localStorage.getItem('spotigrid_token_expires_at')` SHALL return null
 */
describe('Feature: session-persistence, Property 3: Partial token storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('only stores fields that are present in the token response', () => {
    const tokenDataArb = fc.record({
      access_token: fc.string({ minLength: 1 }),
      refresh_token: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
      expires_in: fc.option(fc.integer({ min: 1, max: 86400 }), { nil: undefined }),
    });

    fc.assert(
      fc.property(tokenDataArb, (tokenData) => {
        localStorage.clear();

        const tm = new TokenManager({ clientId: 'test-client-id' });
        tm.save(tokenData);

        // access_token is always present and always stored
        expect(localStorage.getItem('spotigrid_access_token')).toBe(tokenData.access_token);

        // If refresh_token was undefined: localStorage must not contain it
        if (tokenData.refresh_token === undefined) {
          expect(localStorage.getItem('spotigrid_refresh_token')).toBeNull();
        } else {
          // If refresh_token was present: it must be stored
          expect(localStorage.getItem('spotigrid_refresh_token')).toBe(tokenData.refresh_token);
        }

        // If expires_in was undefined: localStorage must not contain expires_at
        if (tokenData.expires_in === undefined) {
          expect(localStorage.getItem('spotigrid_token_expires_at')).toBeNull();
        } else {
          // If expires_in was present: expires_at must be stored (as a numeric string)
          const storedExpiresAt = localStorage.getItem('spotigrid_token_expires_at');
          expect(storedExpiresAt).not.toBeNull();
          expect(Number(storedExpiresAt)).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 }
    );
  });
});
