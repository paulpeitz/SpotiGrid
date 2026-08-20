/**
 * Manages OAuth tokens: storage (localStorage with spotigrid_ prefix),
 * restoration, renewal, and provides a fetch wrapper.
 *
 * @typedef {Object} SessionData
 * @property {string} accessToken
 * @property {string|null} refreshToken
 * @property {number} expiresAt - Unix timestamp in milliseconds
 */
export class TokenManager {
  /**
   * @param {Object} options
   * @param {string} options.clientId - Spotify Client ID for refresh requests
   * @param {Storage} [options.storage] - Optional storage override (defaults to localStorage with in-memory fallback)
   */
  constructor({ clientId, storage } = {}) {
    this._clientId = clientId;
    this._accessToken = null;
    this._refreshToken = null;
    this._expiresAt = null;
    this._refreshPromise = null;
    this._storage = storage || this._detectStorage();
  }

  /**
   * Detects available storage. Tries localStorage first;
   * if setItem throws (e.g. private browsing, quota exceeded),
   * falls back to an in-memory Map-based implementation.
   * @returns {Storage|object} A storage-like object
   */
  _detectStorage() {
    try {
      const testKey = '__spotigrid_storage_test__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      return localStorage;
    } catch (e) {
      return this._createMemoryStorage();
    }
  }

  /**
   * Creates an in-memory storage implementation that mirrors the Storage API.
   * @returns {object} A storage-like object backed by a Map
   */
  _createMemoryStorage() {
    const map = new Map();
    return {
      getItem(key) {
        return map.has(key) ? map.get(key) : null;
      },
      setItem(key, value) {
        map.set(key, String(value));
      },
      removeItem(key) {
        map.delete(key);
      },
    };
  }

  /**
   * Returns the current access token or null.
   * @returns {string|null}
   */
  getAccessToken() {
    return this._accessToken;
  }

  /**
   * Returns the current refresh token or null.
   * @returns {string|null}
   */
  getRefreshToken() {
    return this._refreshToken;
  }

  /**
   * Checks whether the stored token is still valid.
   * Returns true if an access token exists and has not expired.
   * @returns {boolean}
   */
  isTokenValid() {
    return this._accessToken !== null && Date.now() < this._expiresAt;
  }

  /**
   * Saves token data after successful authentication.
   * Writes to storage under spotigrid_* keys. Only writes fields that are present.
   * If storage.setItem throws (e.g. QuotaExceededError), keeps tokens in memory only.
   *
   * @param {Object} tokenData
   * @param {string} tokenData.access_token - The access token (required)
   * @param {string} [tokenData.refresh_token] - The refresh token (optional)
   * @param {number} [tokenData.expires_in] - Token lifetime in seconds (optional)
   */
  save(tokenData) {
    const { access_token, refresh_token, expires_in } = tokenData;

    // Update internal state
    this._accessToken = access_token;

    if (refresh_token !== undefined) {
      this._refreshToken = refresh_token;
    }

    if (expires_in !== undefined) {
      this._expiresAt = Date.now() + expires_in * 1000;
    }

    // Attempt to persist to storage
    try {
      this._storage.setItem('spotigrid_access_token', access_token);

      if (refresh_token !== undefined) {
        this._storage.setItem('spotigrid_refresh_token', refresh_token);
      }

      if (expires_in !== undefined) {
        this._storage.setItem('spotigrid_token_expires_at', String(this._expiresAt));
      }
    } catch (e) {
      // Storage write failed (e.g. QuotaExceededError).
      // Tokens are already held in memory — session remains functional.
    }
  }

  /**
   * Refreshes the access token using the stored refresh token.
   * Uses single-flight pattern: if a refresh is already in progress, returns
   * the existing promise instead of starting a new request.
   *
   * POSTs to Spotify's token endpoint with grant_type=refresh_token.
   * Uses AbortController with a 10-second timeout.
   *
   * On success: calls save() with new token data, returns SessionData.
   * On failure (400, 401, network error, timeout): calls clear(), throws error.
   * Always resets _refreshPromise to null after completion.
   *
   * @returns {Promise<SessionData>}
   */
  refresh() {
    if (this._refreshPromise) {
      return this._refreshPromise;
    }

    this._refreshPromise = this._doRefresh();
    return this._refreshPromise;
  }

  /**
   * Internal method that performs the actual refresh request.
   * @returns {Promise<SessionData>}
   * @private
   */
  async _doRefresh() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const body = `grant_type=refresh_token&refresh_token=${this._refreshToken}&client_id=${this._clientId}`;

      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: controller.signal,
      });

      if (!response.ok) {
        this.clear();
        throw new Error(`Token refresh failed with status ${response.status}`);
      }

      const data = await response.json();
      this.save(data);

      return {
        accessToken: this._accessToken,
        refreshToken: this._refreshToken,
        expiresAt: this._expiresAt,
      };
    } catch (error) {
      // If it's not already cleared by the !response.ok branch above
      if (this._accessToken !== null || this._refreshToken !== null) {
        this.clear();
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
      this._refreshPromise = null;
    }
  }

  /**
   * Restores session from storage. Returns SessionData if a valid session
   * is found, or attempts refresh if the token is expired.
   * Returns null if no session can be restored.
   *
   * @returns {Promise<SessionData|null>}
   */
  async restore() {
    const accessToken = this._storage.getItem('spotigrid_access_token');
    const refreshToken = this._storage.getItem('spotigrid_refresh_token');
    const expiresAtStr = this._storage.getItem('spotigrid_token_expires_at');

    if (!accessToken) {
      this.clear();
      return null;
    }

    const expiresAt = Number(expiresAtStr);

    // Token is still valid — restore from storage without network call
    if (expiresAt > Date.now()) {
      this._accessToken = accessToken;
      this._refreshToken = refreshToken;
      this._expiresAt = expiresAt;
      return { accessToken, refreshToken, expiresAt };
    }

    // Token expired but refresh token available — attempt refresh
    if (refreshToken) {
      try {
        return await this.refresh();
      } catch (e) {
        this.clear();
        return null;
      }
    }

    // Token expired and no refresh token
    this.clear();
    return null;
  }

  /**
   * Fetch wrapper that injects the Authorization header and handles 401 responses
   * by refreshing the token and retrying the request once.
   *
   * @param {string} url - The URL to fetch
   * @param {RequestInit} [options={}] - Fetch options (will be cloned to avoid mutation)
   * @returns {Promise<Response>} The final Response object
   */
  async authenticatedFetch(url, options = {}) {
    // Clone options to avoid mutating caller's object
    const modifiedOptions = { ...options, headers: { ...options.headers, Authorization: `Bearer ${this._accessToken}` } };

    const response = await fetch(url, modifiedOptions);

    if (response.status !== 401) {
      return response;
    }

    // 401 received — attempt token refresh
    if (!this._refreshToken) {
      this.clear();
      throw new Error('Authentication failed: no refresh token available');
    }

    try {
      // If a refresh is already in progress, wait for it; otherwise start one
      if (this._refreshPromise) {
        await this._refreshPromise;
      } else {
        await this.refresh();
      }
    } catch (error) {
      // refresh() already calls clear() internally on failure
      throw error;
    }

    // Retry the original request with the new access token
    const retryOptions = { ...options, headers: { ...options.headers, Authorization: `Bearer ${this._accessToken}` } };
    return fetch(url, retryOptions);
  }

  /**
   * Removes all session data from storage and resets internal state.
   * Clears spotigrid_access_token, spotigrid_refresh_token, and
   * spotigrid_token_expires_at from storage and sets internal fields to null.
   */
  clear() {
    this._storage.removeItem('spotigrid_access_token');
    this._storage.removeItem('spotigrid_refresh_token');
    this._storage.removeItem('spotigrid_token_expires_at');
    this._accessToken = null;
    this._refreshToken = null;
    this._expiresAt = null;
  }
}
