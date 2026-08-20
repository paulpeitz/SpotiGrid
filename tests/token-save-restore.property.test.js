import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { TokenManager } from '../js/token-manager.js';

/**
 * Feature: session-persistence, Property 1: Token save/restore round-trip
 *
 * Validates: Requirements 1.1, 2.5, 3.2
 *
 * For any valid token response object containing an access_token (non-empty string),
 * an optional refresh_token, and an expires_in value (positive integer), saving it
 * via save() and then calling restore() (with time mocked to before expiry) SHALL
 * return a SessionData object where accessToken equals the original access_token,
 * refreshToken equals the original refresh_token (or null if absent), and expiresAt
 * equals the timestamp at save time plus expires_in × 1000.
 */
describe('Feature: session-persistence, Property 1: Token save/restore round-trip', () => {
  const FIXED_NOW = 1700000000000;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('save() followed by restore() returns matching SessionData for any valid token response', async () => {
    const tokenResponseArb = fc.record({
      access_token: fc.string({ minLength: 1 }),
      refresh_token: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
      expires_in: fc.integer({ min: 1, max: 86400 }),
    });

    await fc.assert(
      fc.asyncProperty(tokenResponseArb, async (tokenData) => {
        localStorage.clear();

        const tm = new TokenManager({ clientId: 'test-client-id' });

        // Save the token data
        tm.save(tokenData);

        // Restore from storage (time is still before expiry since expires_in >= 1)
        const result = await tm.restore();

        // Assert round-trip correctness
        expect(result).not.toBeNull();
        expect(result.accessToken).toBe(tokenData.access_token);
        expect(result.refreshToken).toBe(
          tokenData.refresh_token !== undefined ? tokenData.refresh_token : null
        );
        expect(result.expiresAt).toBe(FIXED_NOW + tokenData.expires_in * 1000);
      }),
      { numRuns: 100 }
    );
  });
});
