import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { TokenManager } from '../js/token-manager.js';

/**
 * Feature: session-persistence, Property 9: Clear removes all session data
 *
 * Validates: Requirements 5.2
 *
 * For any state of the TokenManager (with any combination of stored access_token,
 * refresh_token, and expires_at in localStorage), calling clear() SHALL result in
 * localStorage.getItem('spotigrid_access_token') returning null,
 * localStorage.getItem('spotigrid_refresh_token') returning null,
 * localStorage.getItem('spotigrid_token_expires_at') returning null,
 * getAccessToken() returning null, and getRefreshToken() returning null.
 */
describe('Feature: session-persistence, Property 9: Clear removes all session data', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('clear() removes all session data from localStorage and internal state', () => {
    fc.assert(
      fc.property(
        fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
        fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
        fc.option(fc.integer({ min: 1 }), { nil: undefined }),
        (accessToken, refreshToken, expiresAt) => {
          // Setup: pre-populate localStorage with whatever fields are generated
          localStorage.clear();

          if (accessToken !== undefined) {
            localStorage.setItem('spotigrid_access_token', accessToken);
          }
          if (refreshToken !== undefined) {
            localStorage.setItem('spotigrid_refresh_token', refreshToken);
          }
          if (expiresAt !== undefined) {
            localStorage.setItem('spotigrid_token_expires_at', String(expiresAt));
          }

          // Create TokenManager and set internal fields to match
          const tm = new TokenManager({ clientId: 'test-client-id' });
          tm._accessToken = accessToken ?? null;
          tm._refreshToken = refreshToken ?? null;
          tm._expiresAt = expiresAt ?? null;

          // Act
          tm.clear();

          // Assert: all localStorage keys are null
          expect(localStorage.getItem('spotigrid_access_token')).toBeNull();
          expect(localStorage.getItem('spotigrid_refresh_token')).toBeNull();
          expect(localStorage.getItem('spotigrid_token_expires_at')).toBeNull();

          // Assert: internal state is null
          expect(tm.getAccessToken()).toBeNull();
          expect(tm.getRefreshToken()).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});
