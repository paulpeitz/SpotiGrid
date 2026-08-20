import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TokenManager } from '../js/token-manager.js';
import { SpotifyAPI } from '../js/spotify-api.js';

describe('Session Integration Tests (Task 7.2)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Full session lifecycle: Auth → Save → Restore → API → Logout', () => {
    it('completes full cycle', async () => {
      const tm = new TokenManager({ clientId: 'test-client' });

      // Step 1: Save token data (simulating successful auth)
      tm.save({ access_token: 'access-123', refresh_token: 'refresh-456', expires_in: 3600 });

      // Step 2: Create new TokenManager instance (simulating page reload)
      const tm2 = new TokenManager({ clientId: 'test-client' });
      const session = await tm2.restore();
      expect(session).not.toBeNull();
      expect(session.accessToken).toBe('access-123');

      // Step 3: Use with SpotifyAPI
      const api = new SpotifyAPI(tm2);
      fetch.mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => ({ id: 'a1', name: 'Artist', images: [] }),
      });
      const artist = await api.getArtist('a1');
      expect(artist.name).toBe('Artist');

      // Step 4: Logout
      tm2.clear();
      expect(tm2.getAccessToken()).toBeNull();
      expect(localStorage.getItem('spotigrid_access_token')).toBeNull();
    });
  });

  describe('TokenManager + SpotifyAPI 401 handling', () => {
    it('retries API call after 401 with refreshed token', async () => {
      const tm = new TokenManager({ clientId: 'test-client' });
      tm.save({ access_token: 'old-token', refresh_token: 'refresh-token', expires_in: 3600 });

      const api = new SpotifyAPI(tm);

      // First call: 401, Second call: refresh endpoint success, Third call: retry success
      fetch
        .mockResolvedValueOnce({ ok: false, status: 401 })  // original API call
        .mockResolvedValueOnce({  // refresh
          ok: true, status: 200,
          json: async () => ({ access_token: 'new-token', refresh_token: 'new-refresh', expires_in: 3600 }),
        })
        .mockResolvedValueOnce({  // retried API call
          ok: true, status: 200,
          json: async () => ({ id: 'a1', name: 'Artist', images: [] }),
        });

      const result = await api.getArtist('a1');
      expect(result.name).toBe('Artist');
      expect(tm.getAccessToken()).toBe('new-token');
    });
  });

  describe('Memory-only mode (Req 6.3)', () => {
    it('reload shows login state when using memory-only storage', async () => {
      // Create TokenManager with failing storage (simulating private mode)
      const failingStorage = {
        getItem: () => null,
        setItem: () => { throw new DOMException('QuotaExceededError'); },
        removeItem: () => {},
      };

      const tm = new TokenManager({ clientId: 'test', storage: failingStorage });
      tm.save({ access_token: 'mem-token', refresh_token: 'mem-refresh', expires_in: 3600 });
      expect(tm.getAccessToken()).toBe('mem-token'); // Works in memory

      // Simulate "reload" — new TokenManager with same failing storage
      // In a real reload, memory is lost, so getItem returns null
      const tm2 = new TokenManager({ clientId: 'test', storage: failingStorage });
      const session = await tm2.restore();
      expect(session).toBeNull(); // No persisted data
    });
  });

  describe('Logout timing (Req 5.5)', () => {
    it('logout completes within 1 second', async () => {
      const tm = new TokenManager({ clientId: 'test-client' });
      tm.save({ access_token: 'token', refresh_token: 'refresh', expires_in: 3600 });

      const start = Date.now();
      tm.clear();
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(1000);
      expect(tm.getAccessToken()).toBeNull();
    });
  });
});
