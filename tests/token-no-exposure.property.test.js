import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { TokenManager } from '../js/token-manager.js';

/**
 * Feature: session-persistence, Property 10: Refresh token never exposed in URL or DOM
 *
 * Validates: Requirements 6.4
 *
 * For any operation performed by the TokenManager (save, restore, refresh, authenticatedFetch),
 * the refresh_token value SHALL never appear in window.location.href, window.location.search,
 * or as textContent/attribute value of any DOM element.
 */
describe('Feature: session-persistence, Property 10: Refresh token never exposed in URL or DOM', () => {
  let originalFetch;

  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
    localStorage.clear();
    document.body.innerHTML = '';
  });

  /**
   * Helper: asserts that the refresh token does not appear in the URL or DOM.
   */
  function assertNoExposure(refreshToken) {
    // 1. Not in window.location.href
    expect(window.location.href).not.toContain(refreshToken);

    // 2. Not in window.location.search
    expect(window.location.search).not.toContain(refreshToken);

    // 3. Not in any DOM element's textContent
    const allElements = document.querySelectorAll('*');
    for (const el of allElements) {
      expect(el.textContent).not.toContain(refreshToken);

      // 4. Not in any DOM element's attributes
      for (const attr of el.attributes) {
        expect(attr.value).not.toContain(refreshToken);
      }
    }
  }

  /**
   * Generator for a distinctive non-empty refresh token string.
   * Uses a prefix to make tokens easily identifiable and avoid false positives.
   */
  const refreshTokenArb = fc.stringMatching(/^rt_[A-Za-z0-9]{8,32}$/);
  const accessTokenArb = fc.stringMatching(/^at_[A-Za-z0-9]{8,32}$/);

  it('save() never exposes refresh_token in URL or DOM', () => {
    fc.assert(
      fc.property(accessTokenArb, refreshTokenArb, (accessToken, refreshToken) => {
        localStorage.clear();
        document.body.innerHTML = '';

        const tm = new TokenManager({ clientId: 'test-client-id' });

        tm.save({
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: 3600,
        });

        assertNoExposure(refreshToken);
      }),
      { numRuns: 100 }
    );
  });

  it('restore() never exposes refresh_token in URL or DOM', () => {
    fc.assert(
      fc.asyncProperty(accessTokenArb, refreshTokenArb, async (accessToken, refreshToken) => {
        localStorage.clear();
        document.body.innerHTML = '';

        // Pre-populate localStorage with valid session data
        const expiresAt = Date.now() + 3600 * 1000;
        localStorage.setItem('spotigrid_access_token', accessToken);
        localStorage.setItem('spotigrid_refresh_token', refreshToken);
        localStorage.setItem('spotigrid_token_expires_at', String(expiresAt));

        const tm = new TokenManager({ clientId: 'test-client-id' });

        await tm.restore();

        assertNoExposure(refreshToken);
      }),
      { numRuns: 100 }
    );
  });

  it('refresh() never exposes refresh_token in URL or DOM', () => {
    fc.assert(
      fc.asyncProperty(accessTokenArb, refreshTokenArb, async (accessToken, refreshToken) => {
        localStorage.clear();
        document.body.innerHTML = '';

        // Mock fetch to return a successful refresh response
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            access_token: 'new_' + accessToken,
            refresh_token: refreshToken,
            expires_in: 3600,
          }),
        });

        const tm = new TokenManager({ clientId: 'test-client-id' });
        // Set up internal state so refresh has a token to use
        tm.save({
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: 3600,
        });

        await tm.refresh();

        assertNoExposure(refreshToken);
      }),
      { numRuns: 100 }
    );
  });

  it('authenticatedFetch() never exposes refresh_token in URL or DOM', () => {
    fc.assert(
      fc.asyncProperty(accessTokenArb, refreshTokenArb, async (accessToken, refreshToken) => {
        localStorage.clear();
        document.body.innerHTML = '';

        // Mock fetch to return 200 OK
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({}),
        });

        const tm = new TokenManager({ clientId: 'test-client-id' });
        tm.save({
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: 3600,
        });

        await tm.authenticatedFetch('https://api.spotify.com/v1/me', {});

        assertNoExposure(refreshToken);
      }),
      { numRuns: 100 }
    );
  });
});
