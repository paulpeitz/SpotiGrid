import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TokenManager } from '../js/token-manager.js';

describe('TokenManager - Class Skeleton (Task 1.1)', () => {
  let tm;

  beforeEach(() => {
    localStorage.clear();
    tm = new TokenManager({ clientId: 'test-client-id' });
  });

  describe('constructor', () => {
    it('accepts { clientId } and sets _clientId', () => {
      expect(tm._clientId).toBe('test-client-id');
    });

    it('initializes internal state fields to null', () => {
      expect(tm._accessToken).toBeNull();
      expect(tm._refreshToken).toBeNull();
      expect(tm._expiresAt).toBeNull();
      expect(tm._refreshPromise).toBeNull();
    });

    it('uses localStorage as default storage', () => {
      expect(tm._storage).toBe(localStorage);
    });

    it('accepts an optional storage override', () => {
      const customStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
      const tm2 = new TokenManager({ clientId: 'id', storage: customStorage });
      expect(tm2._storage).toBe(customStorage);
    });
  });

  describe('_storage detection with fallback', () => {
    it('falls back to in-memory Map when localStorage.setItem throws', () => {
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = () => { throw new DOMException('QuotaExceededError'); };

      const tm2 = new TokenManager({ clientId: 'id' });
      // Should not be localStorage since setItem throws
      expect(tm2._storage).not.toBe(localStorage);
      // Memory storage should still work
      tm2._storage.setItem('key', 'value');
      expect(tm2._storage.getItem('key')).toBe('value');
      tm2._storage.removeItem('key');
      expect(tm2._storage.getItem('key')).toBeNull();

      Storage.prototype.setItem = originalSetItem;
    });

    it('in-memory storage returns null for missing keys', () => {
      const memStorage = tm._createMemoryStorage();
      expect(memStorage.getItem('nonexistent')).toBeNull();
    });

    it('in-memory storage stores values as strings', () => {
      const memStorage = tm._createMemoryStorage();
      memStorage.setItem('num', 42);
      expect(memStorage.getItem('num')).toBe('42');
    });
  });

  describe('getAccessToken()', () => {
    it('returns null when no token is set', () => {
      expect(tm.getAccessToken()).toBeNull();
    });

    it('returns the access token when set', () => {
      tm._accessToken = 'my-access-token';
      expect(tm.getAccessToken()).toBe('my-access-token');
    });
  });

  describe('getRefreshToken()', () => {
    it('returns null when no token is set', () => {
      expect(tm.getRefreshToken()).toBeNull();
    });

    it('returns the refresh token when set', () => {
      tm._refreshToken = 'my-refresh-token';
      expect(tm.getRefreshToken()).toBe('my-refresh-token');
    });
  });

  describe('isTokenValid()', () => {
    it('returns false when no access token is set', () => {
      expect(tm.isTokenValid()).toBe(false);
    });

    it('returns false when access token exists but is expired', () => {
      tm._accessToken = 'token';
      tm._expiresAt = Date.now() - 1000; // expired 1 second ago
      expect(tm.isTokenValid()).toBe(false);
    });

    it('returns true when access token exists and has not expired', () => {
      tm._accessToken = 'token';
      tm._expiresAt = Date.now() + 60000; // expires in 60 seconds
      expect(tm.isTokenValid()).toBe(true);
    });

    it('returns false when expiresAt is exactly now (boundary)', () => {
      tm._accessToken = 'token';
      tm._expiresAt = Date.now();
      expect(tm.isTokenValid()).toBe(false);
    });
  });
});


describe('TokenManager - clear() method (Task 1.3)', () => {
  let tm;

  beforeEach(() => {
    localStorage.clear();
    tm = new TokenManager({ clientId: 'test-client-id' });
  });

  it('removes spotigrid_access_token from storage', () => {
    localStorage.setItem('spotigrid_access_token', 'some-token');
    tm._accessToken = 'some-token';

    tm.clear();

    expect(localStorage.getItem('spotigrid_access_token')).toBeNull();
  });

  it('removes spotigrid_refresh_token from storage', () => {
    localStorage.setItem('spotigrid_refresh_token', 'some-refresh');
    tm._refreshToken = 'some-refresh';

    tm.clear();

    expect(localStorage.getItem('spotigrid_refresh_token')).toBeNull();
  });

  it('removes spotigrid_token_expires_at from storage', () => {
    localStorage.setItem('spotigrid_token_expires_at', '9999999999999');
    tm._expiresAt = 9999999999999;

    tm.clear();

    expect(localStorage.getItem('spotigrid_token_expires_at')).toBeNull();
  });

  it('sets _accessToken to null', () => {
    tm._accessToken = 'my-token';

    tm.clear();

    expect(tm._accessToken).toBeNull();
  });

  it('sets _refreshToken to null', () => {
    tm._refreshToken = 'my-refresh';

    tm.clear();

    expect(tm._refreshToken).toBeNull();
  });

  it('sets _expiresAt to null', () => {
    tm._expiresAt = Date.now() + 60000;

    tm.clear();

    expect(tm._expiresAt).toBeNull();
  });

  it('clears all storage keys and internal state together', () => {
    localStorage.setItem('spotigrid_access_token', 'access');
    localStorage.setItem('spotigrid_refresh_token', 'refresh');
    localStorage.setItem('spotigrid_token_expires_at', '123456');
    tm._accessToken = 'access';
    tm._refreshToken = 'refresh';
    tm._expiresAt = 123456;

    tm.clear();

    expect(localStorage.getItem('spotigrid_access_token')).toBeNull();
    expect(localStorage.getItem('spotigrid_refresh_token')).toBeNull();
    expect(localStorage.getItem('spotigrid_token_expires_at')).toBeNull();
    expect(tm._accessToken).toBeNull();
    expect(tm._refreshToken).toBeNull();
    expect(tm._expiresAt).toBeNull();
  });

  it('does not affect other localStorage keys', () => {
    localStorage.setItem('spotigrid_access_token', 'token');
    localStorage.setItem('other_key', 'other_value');
    tm._accessToken = 'token';

    tm.clear();

    expect(localStorage.getItem('other_key')).toBe('other_value');
  });

  it('works when storage is already empty', () => {
    // Should not throw even if nothing is stored
    expect(() => tm.clear()).not.toThrow();
    expect(tm._accessToken).toBeNull();
    expect(tm._refreshToken).toBeNull();
    expect(tm._expiresAt).toBeNull();
  });

  it('works with in-memory fallback storage', () => {
    const memTm = new TokenManager({ clientId: 'id', storage: tm._createMemoryStorage() });
    memTm._storage.setItem('spotigrid_access_token', 'mem-token');
    memTm._storage.setItem('spotigrid_refresh_token', 'mem-refresh');
    memTm._storage.setItem('spotigrid_token_expires_at', '999');
    memTm._accessToken = 'mem-token';
    memTm._refreshToken = 'mem-refresh';
    memTm._expiresAt = 999;

    memTm.clear();

    expect(memTm._storage.getItem('spotigrid_access_token')).toBeNull();
    expect(memTm._storage.getItem('spotigrid_refresh_token')).toBeNull();
    expect(memTm._storage.getItem('spotigrid_token_expires_at')).toBeNull();
    expect(memTm._accessToken).toBeNull();
    expect(memTm._refreshToken).toBeNull();
    expect(memTm._expiresAt).toBeNull();
  });

  it('getAccessToken() returns null after clear()', () => {
    tm._accessToken = 'token';

    tm.clear();

    expect(tm.getAccessToken()).toBeNull();
  });

  it('getRefreshToken() returns null after clear()', () => {
    tm._refreshToken = 'refresh';

    tm.clear();

    expect(tm.getRefreshToken()).toBeNull();
  });

  it('isTokenValid() returns false after clear()', () => {
    tm._accessToken = 'token';
    tm._expiresAt = Date.now() + 60000;

    tm.clear();

    expect(tm.isTokenValid()).toBe(false);
  });
});


describe('TokenManager - save() method (Task 1.2)', () => {
  let tm;

  beforeEach(() => {
    localStorage.clear();
    tm = new TokenManager({ clientId: 'test-client-id' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('basic save with all fields', () => {
    it('stores access_token in localStorage under spotigrid_access_token', () => {
      tm.save({ access_token: 'abc123', refresh_token: 'ref456', expires_in: 3600 });
      expect(localStorage.getItem('spotigrid_access_token')).toBe('abc123');
    });

    it('stores refresh_token in localStorage under spotigrid_refresh_token', () => {
      tm.save({ access_token: 'abc123', refresh_token: 'ref456', expires_in: 3600 });
      expect(localStorage.getItem('spotigrid_refresh_token')).toBe('ref456');
    });

    it('stores expiresAt in localStorage under spotigrid_token_expires_at', () => {
      const now = 1700000000000;
      vi.spyOn(Date, 'now').mockReturnValue(now);
      tm.save({ access_token: 'abc123', refresh_token: 'ref456', expires_in: 3600 });
      expect(localStorage.getItem('spotigrid_token_expires_at')).toBe(String(now + 3600 * 1000));
    });

    it('updates internal _accessToken field', () => {
      tm.save({ access_token: 'abc123', refresh_token: 'ref456', expires_in: 3600 });
      expect(tm._accessToken).toBe('abc123');
    });

    it('updates internal _refreshToken field', () => {
      tm.save({ access_token: 'abc123', refresh_token: 'ref456', expires_in: 3600 });
      expect(tm._refreshToken).toBe('ref456');
    });

    it('updates internal _expiresAt field correctly', () => {
      const now = 1700000000000;
      vi.spyOn(Date, 'now').mockReturnValue(now);
      tm.save({ access_token: 'abc123', refresh_token: 'ref456', expires_in: 3600 });
      expect(tm._expiresAt).toBe(now + 3600000);
    });
  });

  describe('partial token data (missing refresh_token)', () => {
    it('does not write spotigrid_refresh_token when refresh_token is absent', () => {
      tm.save({ access_token: 'abc123', expires_in: 3600 });
      expect(localStorage.getItem('spotigrid_refresh_token')).toBeNull();
    });

    it('does not overwrite existing _refreshToken when refresh_token is absent', () => {
      tm._refreshToken = 'existing-refresh';
      tm.save({ access_token: 'new-access' });
      expect(tm._refreshToken).toBe('existing-refresh');
    });

    it('stores access_token even when refresh_token is missing', () => {
      tm.save({ access_token: 'abc123', expires_in: 3600 });
      expect(localStorage.getItem('spotigrid_access_token')).toBe('abc123');
    });
  });

  describe('partial token data (missing expires_in)', () => {
    it('does not write spotigrid_token_expires_at when expires_in is absent', () => {
      tm.save({ access_token: 'abc123', refresh_token: 'ref456' });
      expect(localStorage.getItem('spotigrid_token_expires_at')).toBeNull();
    });

    it('does not overwrite existing _expiresAt when expires_in is absent', () => {
      tm._expiresAt = 9999999999999;
      tm.save({ access_token: 'new-access' });
      expect(tm._expiresAt).toBe(9999999999999);
    });

    it('stores access_token even when expires_in is missing', () => {
      tm.save({ access_token: 'abc123', refresh_token: 'ref456' });
      expect(localStorage.getItem('spotigrid_access_token')).toBe('abc123');
    });
  });

  describe('only access_token provided', () => {
    it('stores only access_token in localStorage', () => {
      tm.save({ access_token: 'only-access' });
      expect(localStorage.getItem('spotigrid_access_token')).toBe('only-access');
      expect(localStorage.getItem('spotigrid_refresh_token')).toBeNull();
      expect(localStorage.getItem('spotigrid_token_expires_at')).toBeNull();
    });

    it('updates only _accessToken in memory', () => {
      tm.save({ access_token: 'only-access' });
      expect(tm._accessToken).toBe('only-access');
      expect(tm._refreshToken).toBeNull();
      expect(tm._expiresAt).toBeNull();
    });
  });

  describe('QuotaExceededError handling (storage write failure)', () => {
    it('keeps tokens in memory when setItem throws', () => {
      const failingStorage = {
        getItem: () => null,
        setItem: () => { throw new DOMException('QuotaExceededError'); },
        removeItem: () => {},
      };
      const tm2 = new TokenManager({ clientId: 'id', storage: failingStorage });
      tm2.save({ access_token: 'mem-token', refresh_token: 'mem-refresh', expires_in: 3600 });
      expect(tm2.getAccessToken()).toBe('mem-token');
      expect(tm2.getRefreshToken()).toBe('mem-refresh');
      expect(tm2._expiresAt).toBeGreaterThan(0);
    });

    it('does not throw when setItem fails', () => {
      const failingStorage = {
        getItem: () => null,
        setItem: () => { throw new DOMException('QuotaExceededError'); },
        removeItem: () => {},
      };
      const tm2 = new TokenManager({ clientId: 'id', storage: failingStorage });
      expect(() => {
        tm2.save({ access_token: 'token', refresh_token: 'refresh', expires_in: 3600 });
      }).not.toThrow();
    });
  });

  describe('expiresAt calculation', () => {
    it('calculates expiresAt as Date.now() + expires_in * 1000', () => {
      const now = 1609459200000; // 2021-01-01T00:00:00.000Z
      vi.spyOn(Date, 'now').mockReturnValue(now);
      tm.save({ access_token: 'token', expires_in: 7200 });
      expect(tm._expiresAt).toBe(now + 7200 * 1000);
    });
  });
});


describe('TokenManager - restore() method (Task 1.4)', () => {
  let tm;

  beforeEach(() => {
    localStorage.clear();
    tm = new TokenManager({ clientId: 'test-client-id' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('no access_token in storage', () => {
    it('returns null when localStorage is empty', async () => {
      const result = await tm.restore();
      expect(result).toBeNull();
    });

    it('calls clear() when no access_token found', async () => {
      const clearSpy = vi.spyOn(tm, 'clear');
      await tm.restore();
      expect(clearSpy).toHaveBeenCalled();
    });

    it('resets internal state when no access_token found', async () => {
      tm._accessToken = 'stale';
      tm._refreshToken = 'stale-refresh';
      tm._expiresAt = 999;
      await tm.restore();
      expect(tm._accessToken).toBeNull();
      expect(tm._refreshToken).toBeNull();
      expect(tm._expiresAt).toBeNull();
    });
  });

  describe('valid token (not expired)', () => {
    it('returns SessionData when token is still valid', async () => {
      const futureTime = Date.now() + 3600000;
      localStorage.setItem('spotigrid_access_token', 'valid-token');
      localStorage.setItem('spotigrid_refresh_token', 'my-refresh');
      localStorage.setItem('spotigrid_token_expires_at', String(futureTime));

      const result = await tm.restore();

      expect(result).toEqual({
        accessToken: 'valid-token',
        refreshToken: 'my-refresh',
        expiresAt: futureTime,
      });
    });

    it('sets internal fields when token is valid', async () => {
      const futureTime = Date.now() + 3600000;
      localStorage.setItem('spotigrid_access_token', 'valid-token');
      localStorage.setItem('spotigrid_refresh_token', 'my-refresh');
      localStorage.setItem('spotigrid_token_expires_at', String(futureTime));

      await tm.restore();

      expect(tm._accessToken).toBe('valid-token');
      expect(tm._refreshToken).toBe('my-refresh');
      expect(tm._expiresAt).toBe(futureTime);
    });

    it('does not call refresh() when token is valid', async () => {
      const futureTime = Date.now() + 3600000;
      localStorage.setItem('spotigrid_access_token', 'valid-token');
      localStorage.setItem('spotigrid_refresh_token', 'my-refresh');
      localStorage.setItem('spotigrid_token_expires_at', String(futureTime));

      tm.refresh = vi.fn();
      await tm.restore();

      expect(tm.refresh).not.toHaveBeenCalled();
    });

    it('returns null refreshToken in SessionData when not stored', async () => {
      const futureTime = Date.now() + 3600000;
      localStorage.setItem('spotigrid_access_token', 'valid-token');
      localStorage.setItem('spotigrid_token_expires_at', String(futureTime));

      const result = await tm.restore();

      expect(result).toEqual({
        accessToken: 'valid-token',
        refreshToken: null,
        expiresAt: futureTime,
      });
    });
  });

  describe('expired token with refresh_token available', () => {
    it('calls this.refresh() when token is expired and refresh_token exists', async () => {
      const pastTime = Date.now() - 1000;
      localStorage.setItem('spotigrid_access_token', 'expired-token');
      localStorage.setItem('spotigrid_refresh_token', 'my-refresh');
      localStorage.setItem('spotigrid_token_expires_at', String(pastTime));

      const refreshResult = { accessToken: 'new-token', refreshToken: 'new-refresh', expiresAt: Date.now() + 3600000 };
      tm.refresh = vi.fn().mockResolvedValue(refreshResult);

      const result = await tm.restore();

      expect(tm.refresh).toHaveBeenCalled();
      expect(result).toEqual(refreshResult);
    });

    it('calls clear() and returns null when refresh() throws', async () => {
      const pastTime = Date.now() - 1000;
      localStorage.setItem('spotigrid_access_token', 'expired-token');
      localStorage.setItem('spotigrid_refresh_token', 'my-refresh');
      localStorage.setItem('spotigrid_token_expires_at', String(pastTime));

      tm.refresh = vi.fn().mockRejectedValue(new Error('refresh failed'));
      const clearSpy = vi.spyOn(tm, 'clear');

      const result = await tm.restore();

      expect(tm.refresh).toHaveBeenCalled();
      expect(clearSpy).toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('expired token without refresh_token', () => {
    it('calls clear() and returns null when no refresh_token', async () => {
      const pastTime = Date.now() - 1000;
      localStorage.setItem('spotigrid_access_token', 'expired-token');
      localStorage.setItem('spotigrid_token_expires_at', String(pastTime));

      const clearSpy = vi.spyOn(tm, 'clear');

      const result = await tm.restore();

      expect(clearSpy).toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('does not call refresh() when no refresh_token exists', async () => {
      const pastTime = Date.now() - 1000;
      localStorage.setItem('spotigrid_access_token', 'expired-token');
      localStorage.setItem('spotigrid_token_expires_at', String(pastTime));

      tm.refresh = vi.fn();

      await tm.restore();

      expect(tm.refresh).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('treats expiresAt of exactly Date.now() as expired', async () => {
      const now = 1700000000000;
      vi.spyOn(Date, 'now').mockReturnValue(now);
      localStorage.setItem('spotigrid_access_token', 'token');
      localStorage.setItem('spotigrid_token_expires_at', String(now));

      const clearSpy = vi.spyOn(tm, 'clear');

      const result = await tm.restore();

      expect(clearSpy).toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('parses expiresAt as a number from string storage', async () => {
      const futureTime = Date.now() + 5000;
      localStorage.setItem('spotigrid_access_token', 'token');
      localStorage.setItem('spotigrid_refresh_token', 'refresh');
      localStorage.setItem('spotigrid_token_expires_at', String(futureTime));

      const result = await tm.restore();

      expect(result.expiresAt).toBe(futureTime);
      expect(typeof result.expiresAt).toBe('number');
    });
  });
});


describe('TokenManager - refresh() method (Task 1.5)', () => {
  let tm;

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    tm = new TokenManager({ clientId: 'test-client-id' });
    tm._refreshToken = 'my-refresh-token';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful refresh', () => {
    it('POSTs to https://accounts.spotify.com/api/token with correct body', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ access_token: 'new-access', refresh_token: 'new-refresh', expires_in: 3600 }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await tm.refresh();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://accounts.spotify.com/api/token',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'grant_type=refresh_token&refresh_token=my-refresh-token&client_id=test-client-id',
        })
      );
    });

    it('calls save() with new token data on success', async () => {
      const tokenData = { access_token: 'new-access', refresh_token: 'new-refresh', expires_in: 3600 };
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(tokenData),
      }));
      const saveSpy = vi.spyOn(tm, 'save');

      await tm.refresh();

      expect(saveSpy).toHaveBeenCalledWith(tokenData);
    });

    it('returns SessionData with accessToken, refreshToken, expiresAt', async () => {
      const now = 1700000000000;
      vi.spyOn(Date, 'now').mockReturnValue(now);
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ access_token: 'new-access', refresh_token: 'new-refresh', expires_in: 3600 }),
      }));

      const result = await tm.refresh();

      expect(result).toEqual({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        expiresAt: now + 3600 * 1000,
      });
    });

    it('resets _refreshPromise to null after success', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ access_token: 'new-access', expires_in: 3600 }),
      }));

      await tm.refresh();

      expect(tm._refreshPromise).toBeNull();
    });
  });

  describe('failure scenarios', () => {
    it('calls clear() and throws on HTTP 400 response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
      }));
      const clearSpy = vi.spyOn(tm, 'clear');

      await expect(tm.refresh()).rejects.toThrow('Token refresh failed with status 400');
      expect(clearSpy).toHaveBeenCalled();
    });

    it('calls clear() and throws on HTTP 401 response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      }));
      const clearSpy = vi.spyOn(tm, 'clear');

      await expect(tm.refresh()).rejects.toThrow('Token refresh failed with status 401');
      expect(clearSpy).toHaveBeenCalled();
    });

    it('calls clear() and throws on network error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
      const clearSpy = vi.spyOn(tm, 'clear');

      await expect(tm.refresh()).rejects.toThrow('Failed to fetch');
      expect(clearSpy).toHaveBeenCalled();
    });

    it('calls clear() and throws on abort/timeout', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('The operation was aborted.', 'AbortError')));
      const clearSpy = vi.spyOn(tm, 'clear');

      await expect(tm.refresh()).rejects.toThrow();
      expect(clearSpy).toHaveBeenCalled();
    });

    it('resets _refreshPromise to null after failure', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
      }));

      await expect(tm.refresh()).rejects.toThrow();

      expect(tm._refreshPromise).toBeNull();
    });

    it('clears all session data from storage on failure', async () => {
      localStorage.setItem('spotigrid_access_token', 'old-access');
      localStorage.setItem('spotigrid_refresh_token', 'old-refresh');
      localStorage.setItem('spotigrid_token_expires_at', '9999999999999');
      tm._accessToken = 'old-access';

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      }));

      await expect(tm.refresh()).rejects.toThrow();

      expect(localStorage.getItem('spotigrid_access_token')).toBeNull();
      expect(localStorage.getItem('spotigrid_refresh_token')).toBeNull();
      expect(localStorage.getItem('spotigrid_token_expires_at')).toBeNull();
      expect(tm._accessToken).toBeNull();
      expect(tm._refreshToken).toBeNull();
      expect(tm._expiresAt).toBeNull();
    });
  });

  describe('single-flight / deduplication pattern', () => {
    it('returns the same promise if refresh is already in progress', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ access_token: 'new-access', expires_in: 3600 }),
      }));

      const promise1 = tm.refresh();
      const promise2 = tm.refresh();

      expect(promise1).toBe(promise2);
      await promise1;
    });

    it('makes only one fetch call for concurrent refresh requests', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ access_token: 'new-access', expires_in: 3600 }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const promise1 = tm.refresh();
      const promise2 = tm.refresh();
      const promise3 = tm.refresh();

      await Promise.all([promise1, promise2, promise3]);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('allows a new refresh after the previous one completes', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ access_token: 'new-access', refresh_token: 'new-refresh', expires_in: 3600 }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await tm.refresh();
      // After first refresh, _refreshPromise should be null again
      await tm.refresh();

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('allows a new refresh after a failed one', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({ ok: false, status: 400 })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'new-access', refresh_token: 'new-refresh', expires_in: 3600 }),
        });
      vi.stubGlobal('fetch', mockFetch);

      await expect(tm.refresh()).rejects.toThrow();
      // Restore refresh token since clear() wiped it
      tm._refreshToken = 'my-refresh-token';
      const result = await tm.refresh();

      expect(result.accessToken).toBe('new-access');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('AbortController / timeout', () => {
    it('passes a signal to the fetch call', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ access_token: 'new-access', expires_in: 3600 }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await tm.refresh();

      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[1].signal).toBeInstanceOf(AbortSignal);
    });
  });
});


describe('TokenManager - authenticatedFetch() method (Task 1.6)', () => {
  let tm;

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    tm = new TokenManager({ clientId: 'test-client-id' });
    tm._accessToken = 'my-access-token';
    tm._refreshToken = 'my-refresh-token';
    tm._expiresAt = Date.now() + 3600000;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful request (non-401)', () => {
    it('injects Authorization header with current access token', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ status: 200 });
      vi.stubGlobal('fetch', mockFetch);

      await tm.authenticatedFetch('https://api.spotify.com/v1/me');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.spotify.com/v1/me',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer my-access-token',
          }),
        })
      );
    });

    it('returns the response directly when status is not 401', async () => {
      const mockResponse = { status: 200, ok: true };
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      const result = await tm.authenticatedFetch('https://api.spotify.com/v1/me');

      expect(result).toBe(mockResponse);
    });

    it('preserves existing headers from options', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ status: 200 });
      vi.stubGlobal('fetch', mockFetch);

      await tm.authenticatedFetch('https://api.spotify.com/v1/me', {
        headers: { 'Content-Type': 'application/json' },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.spotify.com/v1/me',
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer my-access-token',
          },
        })
      );
    });

    it('does not mutate the original options object', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200 }));
      const originalOptions = { headers: { 'X-Custom': 'value' } };

      await tm.authenticatedFetch('https://api.spotify.com/v1/me', originalOptions);

      expect(originalOptions.headers).toEqual({ 'X-Custom': 'value' });
      expect(originalOptions.headers.Authorization).toBeUndefined();
    });

    it('passes other options through (method, body, etc.)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ status: 200 });
      vi.stubGlobal('fetch', mockFetch);

      await tm.authenticatedFetch('https://api.spotify.com/v1/me/player/play', {
        method: 'PUT',
        body: JSON.stringify({ uris: ['spotify:track:123'] }),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.spotify.com/v1/me/player/play',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ uris: ['spotify:track:123'] }),
        })
      );
    });

    it('returns response for non-401 error statuses (e.g. 403, 500)', async () => {
      const mockResponse = { status: 403, ok: false };
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      const result = await tm.authenticatedFetch('https://api.spotify.com/v1/me');

      expect(result).toBe(mockResponse);
    });
  });

  describe('401 with no refresh token', () => {
    it('calls clear() when 401 and no refresh_token', async () => {
      tm._refreshToken = null;
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 401 }));
      const clearSpy = vi.spyOn(tm, 'clear');

      await expect(tm.authenticatedFetch('https://api.spotify.com/v1/me')).rejects.toThrow();

      expect(clearSpy).toHaveBeenCalled();
    });

    it('throws an error when 401 and no refresh_token', async () => {
      tm._refreshToken = null;
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 401 }));

      await expect(tm.authenticatedFetch('https://api.spotify.com/v1/me')).rejects.toThrow(
        'Authentication failed: no refresh token available'
      );
    });
  });

  describe('401 with successful refresh', () => {
    it('calls refresh() when 401 and refresh_token exists', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({ status: 401 })  // initial request
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ access_token: 'new-token', expires_in: 3600 }) })  // refresh
        .mockResolvedValueOnce({ status: 200 });  // retry
      vi.stubGlobal('fetch', mockFetch);

      const refreshSpy = vi.spyOn(tm, 'refresh');
      await tm.authenticatedFetch('https://api.spotify.com/v1/me');

      expect(refreshSpy).toHaveBeenCalled();
    });

    it('retries the original request with the new token after refresh', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({ status: 401 })  // initial request
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ access_token: 'new-access-token', expires_in: 3600 }) })  // refresh
        .mockResolvedValueOnce({ status: 200 });  // retry
      vi.stubGlobal('fetch', mockFetch);

      await tm.authenticatedFetch('https://api.spotify.com/v1/me');

      // Third call is the retry with new token
      const retryCall = mockFetch.mock.calls[2];
      expect(retryCall[0]).toBe('https://api.spotify.com/v1/me');
      expect(retryCall[1].headers.Authorization).toBe('Bearer new-access-token');
    });

    it('returns the retry response (not the 401)', async () => {
      const retryResponse = { status: 200, ok: true };
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({ status: 401 })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ access_token: 'new-token', expires_in: 3600 }) })
        .mockResolvedValueOnce(retryResponse);
      vi.stubGlobal('fetch', mockFetch);

      const result = await tm.authenticatedFetch('https://api.spotify.com/v1/me');

      expect(result).toBe(retryResponse);
    });

    it('returns the retry response even if the retry also returns 401', async () => {
      const secondResponse = { status: 401, ok: false };
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({ status: 401 })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ access_token: 'new-token', expires_in: 3600 }) })
        .mockResolvedValueOnce(secondResponse);
      vi.stubGlobal('fetch', mockFetch);

      const result = await tm.authenticatedFetch('https://api.spotify.com/v1/me');

      // Should return the retry response without further checking its status
      expect(result).toBe(secondResponse);
    });
  });

  describe('401 with failed refresh', () => {
    it('throws error when refresh fails', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({ status: 401 })
        .mockResolvedValueOnce({ ok: false, status: 400 });  // refresh fails
      vi.stubGlobal('fetch', mockFetch);

      await expect(tm.authenticatedFetch('https://api.spotify.com/v1/me'))
        .rejects.toThrow('Token refresh failed with status 400');
    });

    it('calls clear() when refresh fails (via refresh method)', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({ status: 401 })
        .mockResolvedValueOnce({ ok: false, status: 400 });
      vi.stubGlobal('fetch', mockFetch);
      const clearSpy = vi.spyOn(tm, 'clear');

      await expect(tm.authenticatedFetch('https://api.spotify.com/v1/me')).rejects.toThrow();

      expect(clearSpy).toHaveBeenCalled();
    });

    it('does not retry the original request when refresh fails', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({ status: 401 })
        .mockResolvedValueOnce({ ok: false, status: 401 });
      vi.stubGlobal('fetch', mockFetch);

      await expect(tm.authenticatedFetch('https://api.spotify.com/v1/me')).rejects.toThrow();

      // Only 2 calls: original request + refresh attempt. No retry.
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('401 with refresh already in progress', () => {
    it('waits for existing refresh promise and retries with new token', async () => {
      // Simulate a refresh already in progress
      let resolveRefresh;
      const refreshPromise = new Promise((resolve) => { resolveRefresh = resolve; });
      tm._refreshPromise = refreshPromise.then(() => {
        tm._accessToken = 'refreshed-token';
        tm._refreshPromise = null;
      });

      const mockFetch = vi.fn()
        .mockResolvedValueOnce({ status: 401 })  // initial request returns 401
        .mockResolvedValueOnce({ status: 200 });  // retry after refresh completes
      vi.stubGlobal('fetch', mockFetch);

      const fetchPromise = tm.authenticatedFetch('https://api.spotify.com/v1/me');

      // Resolve the in-progress refresh
      resolveRefresh();

      const result = await fetchPromise;

      expect(result.status).toBe(200);
      // The retry should use the new token
      const retryCall = mockFetch.mock.calls[1];
      expect(retryCall[1].headers.Authorization).toBe('Bearer refreshed-token');
    });

    it('does not start a new refresh when one is already in progress', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({ status: 401 })  // initial request
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ access_token: 'new-token', expires_in: 3600 }) })  // refresh endpoint
        .mockResolvedValueOnce({ status: 200 });  // retry
      vi.stubGlobal('fetch', mockFetch);

      // Start a refresh that takes some time
      let resolveRefresh;
      tm._refreshPromise = new Promise((resolve) => { resolveRefresh = resolve; }).then(() => {
        tm._accessToken = 'queued-token';
        tm._refreshPromise = null;
      });

      const fetchPromise = tm.authenticatedFetch('https://api.spotify.com/v1/me');
      resolveRefresh();

      await fetchPromise;

      // Should only have the initial fetch + retry, no refresh endpoint call from authenticatedFetch
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('options defaults', () => {
    it('works when no options are provided', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ status: 200 });
      vi.stubGlobal('fetch', mockFetch);

      const result = await tm.authenticatedFetch('https://api.spotify.com/v1/me');

      expect(result.status).toBe(200);
      expect(mockFetch.mock.calls[0][1].headers.Authorization).toBe('Bearer my-access-token');
    });

    it('works when options has no headers property', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ status: 200 });
      vi.stubGlobal('fetch', mockFetch);

      await tm.authenticatedFetch('https://api.spotify.com/v1/me', { method: 'GET' });

      expect(mockFetch.mock.calls[0][1].headers.Authorization).toBe('Bearer my-access-token');
    });
  });
});
