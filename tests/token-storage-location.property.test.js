import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { TokenManager } from '../js/token-manager.js';

/**
 * Feature: session-persistence, Property 2: Storage location invariant
 *
 * Validates: Requirements 1.2, 6.1
 *
 * For any token data saved by the TokenManager, the tokens SHALL only be present
 * under `spotigrid_`-prefixed keys in localStorage. After any save operation,
 * sessionStorage SHALL NOT contain any keys with prefix `spotigrid_`, and
 * `document.cookie` SHALL NOT contain the access_token or refresh_token value.
 */
describe('Feature: session-persistence, Property 2: Storage location invariant', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(';').forEach((c) => {
      const name = c.split('=')[0].trim();
      if (name) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      }
    });
  });

  it('tokens are only stored in localStorage under spotigrid_ prefix, never in sessionStorage or cookies', () => {
    const tokenDataArb = fc.record({
      access_token: fc.string({ minLength: 1 }),
      refresh_token: fc.string({ minLength: 1 }),
      expires_in: fc.integer({ min: 1, max: 86400 }),
    });

    fc.assert(
      fc.property(tokenDataArb, (tokenData) => {
        // Clear state before each run
        localStorage.clear();
        sessionStorage.clear();

        const tm = new TokenManager({ clientId: 'test-client-id' });
        tm.save(tokenData);

        // 1. sessionStorage SHALL NOT contain any key starting with `spotigrid_`
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          expect(key.startsWith('spotigrid_')).toBe(false);
        }

        // 2. document.cookie SHALL NOT contain the access_token or refresh_token value
        const cookies = document.cookie;
        expect(cookies).not.toContain(tokenData.access_token);
        expect(cookies).not.toContain(tokenData.refresh_token);

        // 3. localStorage DOES contain `spotigrid_access_token` with the correct value
        expect(localStorage.getItem('spotigrid_access_token')).toBe(tokenData.access_token);
      }),
      { numRuns: 100 }
    );
  });
});
