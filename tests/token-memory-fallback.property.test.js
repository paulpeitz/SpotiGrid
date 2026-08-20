import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { TokenManager } from '../js/token-manager.js';

/**
 * Feature: session-persistence, Property 4: Memory fallback preserves access
 *
 * Validates: Requirements 1.3, 6.2
 *
 * For any token data, when localStorage.setItem throws an exception,
 * the TokenManager SHALL still hold the token data in memory such that
 * `getAccessToken()` returns the access_token and `getRefreshToken()`
 * returns the refresh_token (if provided).
 */
describe('Feature: session-persistence, Property 4: Memory fallback preserves access', () => {
  it('tokens are accessible in memory even when storage.setItem throws', () => {
    const tokenDataArb = fc.record({
      access_token: fc.string({ minLength: 1 }),
      refresh_token: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
      expires_in: fc.integer({ min: 1, max: 86400 }),
    });

    fc.assert(
      fc.property(tokenDataArb, (tokenData) => {
        const failingStorage = {
          getItem: () => null,
          setItem: () => { throw new DOMException('QuotaExceededError'); },
          removeItem: () => {},
        };

        const tm = new TokenManager({ clientId: 'test', storage: failingStorage });

        tm.save(tokenData);

        expect(tm.getAccessToken()).toBe(tokenData.access_token);

        if (tokenData.refresh_token !== undefined) {
          expect(tm.getRefreshToken()).toBe(tokenData.refresh_token);
        } else {
          expect(tm.getRefreshToken()).toBeNull();
        }
      }),
      { numRuns: 100 }
    );
  });
});
