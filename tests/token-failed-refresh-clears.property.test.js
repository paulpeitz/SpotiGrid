import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { TokenManager } from '../js/token-manager.js';

/**
 * Feature: session-persistence, Property 6: Failed refresh clears all session data
 *
 * Validates: Requirements 2.3, 3.4, 4.1, 4.4
 *
 * For any refresh failure scenario (network error, HTTP 400, HTTP 401, or missing
 * refresh_token), the TokenManager SHALL remove all spotigrid_-prefixed keys from
 * localStorage AND set the in-memory accessToken and refreshToken to null.
 */
describe('Feature: session-persistence, Property 6: Failed refresh clears all session data', () => {
  const FIXED_NOW = 1700000000000;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const failureTypeArb = fc.constantFrom('network-error', 'http-400', 'http-401');

  const initialTokenStateArb = fc.record({
    access_token: fc.string({ minLength: 1, maxLength: 64 }),
    refresh_token: fc.string({ minLength: 1, maxLength: 64 }),
    expires_at: fc.integer({ min: FIXED_NOW + 1000, max: FIXED_NOW + 86400000 }),
  });

  function mockFetchForFailure(failureType) {
    switch (failureType) {
      case 'network-error':
        return vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
      case 'http-400':
        return vi.fn().mockResolvedValue({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ error: 'invalid_grant' }),
        });
      case 'http-401':
        return vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: 'invalid_client' }),
        });
      default:
        throw new Error(`Unknown failure type: ${failureType}`);
    }
  }

  it('failed refresh clears all spotigrid_ keys from localStorage and nulls in-memory tokens', async () => {
    await fc.assert(
      fc.asyncProperty(initialTokenStateArb, failureTypeArb, async (tokenState, failureType) => {
        localStorage.clear();

        // Pre-populate localStorage with spotigrid_* keys
        localStorage.setItem('spotigrid_access_token', tokenState.access_token);
        localStorage.setItem('spotigrid_refresh_token', tokenState.refresh_token);
        localStorage.setItem('spotigrid_token_expires_at', String(tokenState.expires_at));

        // Create TokenManager and set internal state
        const tm = new TokenManager({ clientId: 'test-client-id' });
        tm._accessToken = tokenState.access_token;
        tm._refreshToken = tokenState.refresh_token;
        tm._expiresAt = tokenState.expires_at;

        // Mock fetch to simulate the chosen failure
        const mockFetch = mockFetchForFailure(failureType);
        vi.stubGlobal('fetch', mockFetch);

        // Call refresh() and expect it to throw
        await expect(tm.refresh()).rejects.toThrow();

        // After the error, all spotigrid_ keys must be removed from localStorage
        expect(localStorage.getItem('spotigrid_access_token')).toBeNull();
        expect(localStorage.getItem('spotigrid_refresh_token')).toBeNull();
        expect(localStorage.getItem('spotigrid_token_expires_at')).toBeNull();

        // In-memory tokens must be null
        expect(tm.getAccessToken()).toBeNull();
        expect(tm.getRefreshToken()).toBeNull();
      }),
      { numRuns: 100 }
    );
  });
});
