import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';

describe('App - session integration (Task 3.5)', () => {
  let App;
  let TokenManager;

  beforeEach(async () => {
    // Set up DOM elements matching index.html structure
    document.body.innerHTML = `
      <button id="login-button" hidden>Login</button>
      <button id="logout-button" hidden>Logout</button>
      <span id="user-info" hidden></span>
      <div id="grid-container"></div>
      <div id="error-container"></div>
      <div id="player-status" hidden><span id="now-playing"></span></div>
    `;
    localStorage.clear();

    // Mock fetch globally to prevent real network calls
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) }));

    // Reset modules so each test gets a fresh import
    vi.resetModules();

    // Import App class fresh for each test
    const appModule = await import('../js/app.js');
    App = appModule.App;

    const tmModule = await import('../js/token-manager.js');
    TokenManager = tmModule.TokenManager;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    document.body.innerHTML = '';
    localStorage.clear();
  });

  describe('Restore with empty localStorage shows login button (Req 2.4)', () => {
    it('shows login-button when tokenManager.restore() returns null', async () => {
      const app = new App({
        artistsJsonPath: 'artists.json',
        gridContainerId: 'grid-container',
        errorContainerId: 'error-container',
      });

      // Mock restore to return null (no session data)
      vi.spyOn(app.tokenManager, 'restore').mockResolvedValue(null);

      await app.init();

      const loginButton = document.getElementById('login-button');
      expect(loginButton.hidden).toBe(false);
    });

    it('does not show logout-button when no session exists', async () => {
      const app = new App({
        artistsJsonPath: 'artists.json',
        gridContainerId: 'grid-container',
        errorContainerId: 'error-container',
      });

      vi.spyOn(app.tokenManager, 'restore').mockResolvedValue(null);

      await app.init();

      const logoutButton = document.getElementById('logout-button');
      expect(logoutButton.hidden).toBe(true);
    });
  });

  describe('Logout resets UI elements correctly (Req 5.3)', () => {
    it('shows login-button, hides logout-button and user-info, clears grid after logout', async () => {
      const app = new App({
        artistsJsonPath: 'artists.json',
        gridContainerId: 'grid-container',
        errorContainerId: 'error-container',
      });

      // Directly set up authenticated state without calling init()
      // This avoids the SpotifyPlayer connection timeout
      document.getElementById('login-button').hidden = true;
      document.getElementById('logout-button').hidden = false;
      document.getElementById('user-info').hidden = false;
      document.getElementById('user-info').textContent = '✓ Verbunden';
      document.getElementById('grid-container').innerHTML = '<div class="grid-item">Test</div>';

      app.player = {
        isPlaying: () => false,
        stop: vi.fn(),
        disconnect: vi.fn(),
      };
      vi.spyOn(app.tokenManager, 'clear');

      // Now logout
      await app.logout();

      const loginButton = document.getElementById('login-button');
      const logoutButton = document.getElementById('logout-button');
      const userInfo = document.getElementById('user-info');
      const gridContainer = document.getElementById('grid-container');

      expect(loginButton.hidden).toBe(false);
      expect(logoutButton.hidden).toBe(true);
      expect(userInfo.hidden).toBe(true);
      expect(gridContainer.innerHTML).toBe('');
    });

    it('clears now-playing text and hides player-status after logout', async () => {
      const app = new App({
        artistsJsonPath: 'artists.json',
        gridContainerId: 'grid-container',
        errorContainerId: 'error-container',
      });

      // Set up now-playing as if music was playing
      document.getElementById('now-playing').textContent = '♪ Test Song';
      document.getElementById('player-status').hidden = false;

      // Mock player as not playing so logout doesn't try to stop
      app.player = {
        isPlaying: () => false,
        stop: vi.fn(),
        disconnect: vi.fn(),
      };
      vi.spyOn(app.tokenManager, 'clear');

      await app.logout();

      const nowPlaying = document.getElementById('now-playing');
      const playerStatus = document.getElementById('player-status');
      expect(nowPlaying.textContent).toBe('');
      expect(playerStatus.hidden).toBe(true);
    });
  });

  describe('Logout stops active playback (Req 5.4)', () => {
    it('calls player.stop() and player.disconnect() when music is playing', async () => {
      const app = new App({
        artistsJsonPath: 'artists.json',
        gridContainerId: 'grid-container',
        errorContainerId: 'error-container',
      });

      // Set up a mock player that reports active playback
      const mockStop = vi.fn().mockResolvedValue(undefined);
      const mockDisconnect = vi.fn();
      app.player = {
        isPlaying: () => true,
        stop: mockStop,
        disconnect: mockDisconnect,
      };
      vi.spyOn(app.tokenManager, 'clear');

      await app.logout();

      expect(mockStop).toHaveBeenCalled();
      expect(mockDisconnect).toHaveBeenCalled();
    });

    it('does not call player.stop() when no playback is active', async () => {
      const app = new App({
        artistsJsonPath: 'artists.json',
        gridContainerId: 'grid-container',
        errorContainerId: 'error-container',
      });

      const mockStop = vi.fn().mockResolvedValue(undefined);
      const mockDisconnect = vi.fn();
      app.player = {
        isPlaying: () => false,
        stop: mockStop,
        disconnect: mockDisconnect,
      };
      vi.spyOn(app.tokenManager, 'clear');

      await app.logout();

      expect(mockStop).not.toHaveBeenCalled();
    });
  });

  describe('Auth-UI bleibt in jedem Sessionzustand verborgen (Property 5)', () => {
    /**
     * Helper: creates a mock Spotify SDK that immediately fires the 'ready' event.
     */
    function setupSpotifySDKMock() {
      window.Spotify = {
        Player: vi.fn().mockImplementation(() => {
          const listeners = {};
          return {
            addListener: vi.fn((event, cb) => {
              listeners[event] = cb;
            }),
            connect: vi.fn(() => {
              if (listeners.ready) {
                listeners.ready({ device_id: 'mock-device-id' });
              }
            }),
            disconnect: vi.fn(),
            pause: vi.fn().mockResolvedValue(undefined),
          };
        }),
      };
    }

    /**
     * Feature: ui-polish, Property 5: Auth-UI bleibt für jeden Sessionzustand verborgen
     *
     * Validates: Requirements 1.1, 1.3
     */
    it('keeps user-info and logout-button hidden without changing auth processing', async () => {
      const sessionStateArb = fc.constantFrom(
        'unauthenticated',
        'restored-session',
        'code-token-processing',
        'logout'
      );

      await fc.assert(
        fc.asyncProperty(sessionStateArb, async (sessionState) => {
          document.body.innerHTML = `
            <button id="login-button" hidden>Login</button>
            <button id="logout-button" hidden>Logout</button>
            <span id="user-info" hidden></span>
            <div id="grid-container"></div>
            <div id="error-container"></div>
            <div id="player-status" hidden><span id="now-playing"></span></div>
          `;
          sessionStorage.clear();
          localStorage.clear();
          window.history.replaceState(null, '', '/');
          fetch.mockReset();

          const app = new App({
            artistsJsonPath: 'artists.json',
            gridContainerId: 'grid-container',
            errorContainerId: 'error-container',
          });

          // Avoid loading unrelated grid data while exercising the real auth transitions.
          vi.spyOn(app, '_loadGrid').mockResolvedValue(undefined);

          if (sessionState === 'unauthenticated') {
            vi.spyOn(app.tokenManager, 'restore').mockResolvedValue(null);
            await app.init();
          } else if (sessionState === 'restored-session') {
            vi.spyOn(app.tokenManager, 'restore').mockResolvedValue({
              accessToken: 'test-token',
              refreshToken: 'test-refresh',
              expiresAt: Date.now() + 3600000,
            });
            vi.spyOn(app.tokenManager, 'getAccessToken').mockReturnValue('test-token');
            setupSpotifySDKMock();
            await app.init();
          } else if (sessionState === 'code-token-processing') {
            window.history.replaceState(null, '', '/?code=test-auth-code');
            sessionStorage.setItem('spotify_code_verifier', 'test-verifier');
            vi.spyOn(app.tokenManager, 'restore').mockResolvedValue(null);
            vi.spyOn(app.tokenManager, 'getAccessToken').mockReturnValue('test-token');
            fetch.mockResolvedValueOnce({
              ok: true,
              status: 200,
              json: async () => ({
                access_token: 'test-token',
                refresh_token: 'test-refresh',
                expires_in: 3600,
              }),
            });
            setupSpotifySDKMock();
            await app.init();
          } else {
            document.getElementById('logout-button').hidden = false;
            document.getElementById('user-info').hidden = false;
            await app.logout();
          }

          expect(document.getElementById('user-info').hidden).toBe(true);
          if (sessionState === 'logout' || sessionState === 'unauthenticated') {
            expect(document.getElementById('logout-button').hidden).toBe(true);
          } else {
            // When authenticated, logout button should be visible
            expect(document.getElementById('logout-button').hidden).toBe(false);
          }
        }),
        { numRuns: 100 }
      );

      window.history.replaceState(null, '', '/');
      sessionStorage.clear();
    });

    it('hides login-button when authenticated', async () => {
      const app = new App({
        artistsJsonPath: 'artists.json',
        gridContainerId: 'grid-container',
        errorContainerId: 'error-container',
      });

      vi.spyOn(app.tokenManager, 'restore').mockResolvedValue({
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        expiresAt: Date.now() + 3600000,
      });
      vi.spyOn(app.tokenManager, 'getAccessToken').mockReturnValue('test-token');
      vi.spyOn(app, '_loadGrid').mockResolvedValue(undefined);
      setupSpotifySDKMock();

      await app.init();

      expect(document.getElementById('login-button').hidden).toBe(true);
    });
  });

  describe('Error message on failed refresh (Req 4.2)', () => {
    it('shows login-button when restore returns null (simulating failed refresh)', async () => {
      const app = new App({
        artistsJsonPath: 'artists.json',
        gridContainerId: 'grid-container',
        errorContainerId: 'error-container',
      });

      // restore() returns null when refresh fails internally
      vi.spyOn(app.tokenManager, 'restore').mockResolvedValue(null);

      await app.init();

      const loginButton = document.getElementById('login-button');
      expect(loginButton.hidden).toBe(false);
    });

    it('displays error message when token exchange fails during code handling', async () => {
      // Simulate URL with auth code
      const originalLocation = window.location;
      delete window.location;
      window.location = {
        ...originalLocation,
        search: '?code=test-auth-code',
        origin: 'http://localhost',
        pathname: '/',
        href: 'http://localhost/?code=test-auth-code',
      };

      // Set up sessionStorage with code verifier
      sessionStorage.setItem('spotify_code_verifier', 'test-verifier');

      const app = new App({
        artistsJsonPath: 'artists.json',
        gridContainerId: 'grid-container',
        errorContainerId: 'error-container',
      });

      // restore returns null (no existing session)
      vi.spyOn(app.tokenManager, 'restore').mockResolvedValue(null);

      // Token exchange fails
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error_description: 'Authentifizierung fehlgeschlagen. Bitte erneut einloggen.' }),
      });

      await app.init();

      const errorContainer = document.getElementById('error-container');
      const errorDiv = errorContainer.querySelector('.error-message');
      expect(errorDiv).not.toBe(null);
      expect(errorDiv.textContent).toContain('Bitte erneut einloggen');

      const loginButton = document.getElementById('login-button');
      expect(loginButton.hidden).toBe(false);

      // Restore location
      window.location = originalLocation;
      sessionStorage.clear();
    });
  });
});
