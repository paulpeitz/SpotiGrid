import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { App } from '../js/app.js';

/**
 * Integrationstests für Fehlerbehandlung und modulübergreifende Szenarien.
 *
 * After session-persistence refactoring, the App uses OAuth (TokenManager)
 * instead of a manual token-input field. These tests simulate an authenticated
 * session (via mocked restore()) and then verify grid-loading error handling.
 *
 * Validates: Requirements 1.2, 1.3, 2.6, 2.7, 6.5
 */

// Hilfsfunktion: Erstellt ein Array von 20 gültigen Artist IDs
function createValidArtistIds(count = 20) {
  return Array.from({ length: count }, (_, i) => `artist${i}`);
}

// Hilfsfunktion: Erstellt eine Mock-Response für einen einzelnen Künstler
function createArtistResponse(id, name) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      id,
      name,
      images: [{ url: `https://img.com/${id}.jpg`, width: 640, height: 640 }],
    }),
  };
}

// Hilfsfunktion: Erstellt eine Mock-Search-Response mit Preview-Track
function createSearchResponse(trackName, previewUrl) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      tracks: {
        items: [{ name: trackName, preview_url: previewUrl }],
      },
    }),
  };
}

/**
 * Sets up a Spotify SDK mock so SpotifyPlayer.connect() resolves immediately.
 */
function setupSpotifySDKMock() {
  window.Spotify = {
    Player: vi.fn().mockImplementation(() => {
      const listeners = {};
      return {
        addListener: vi.fn((event, cb) => { listeners[event] = cb; }),
        connect: vi.fn(() => {
          if (listeners.ready) listeners.ready({ device_id: 'mock-device-id' });
        }),
        disconnect: vi.fn(),
        pause: vi.fn().mockResolvedValue(undefined),
      };
    }),
  };
}

/**
 * Helper to create an authenticated App instance.
 * Mocks tokenManager.restore() to simulate existing session, sets up Spotify SDK mock.
 */
function createAuthenticatedApp(config = {}) {
  const app = new App({
    artistsJsonPath: 'artists.json',
    gridContainerId: 'grid-container',
    errorContainerId: 'error-container',
    ...config,
  });

  vi.spyOn(app.tokenManager, 'restore').mockResolvedValue({
    accessToken: 'valid-token',
    refreshToken: 'valid-refresh',
    expiresAt: Date.now() + 3600000,
  });
  vi.spyOn(app.tokenManager, 'getAccessToken').mockReturnValue('valid-token');
  vi.spyOn(app.tokenManager, 'authenticatedFetch').mockImplementation(async (url, opts) => {
    return fetch(url, opts);
  });

  setupSpotifySDKMock();
  return app;
}

describe('Integration: JSON-Ladefehler-Szenarien', () => {
  let app;

  beforeEach(() => {
    document.body.innerHTML = `
      <button id="login-button" hidden>Login</button>
      <button id="logout-button" hidden>Logout</button>
      <span id="user-info" hidden></span>
      <div id="error-container"></div>
      <div id="grid-container"></div>
      <div id="player-status" hidden><span id="now-playing"></span></div>
    `;

    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
    delete window.Spotify;
  });

  it('zeigt Ladefehler wenn artists.json 404 zurückgibt', async () => {
    app = createAuthenticatedApp();
    fetch.mockResolvedValueOnce({ ok: false, status: 404 });

    await app.init();

    const errorContainer = document.getElementById('error-container');
    const errorDiv = errorContainer.querySelector('.error-message');
    expect(errorDiv).not.toBe(null);
    expect(errorDiv.textContent).toContain('konnte nicht geladen werden');
  });

  it('zeigt Ladefehler wenn artists.json 500 zurückgibt', async () => {
    app = createAuthenticatedApp();
    fetch.mockResolvedValueOnce({ ok: false, status: 500 });

    await app.init();

    const errorContainer = document.getElementById('error-container');
    const errorDiv = errorContainer.querySelector('.error-message');
    expect(errorDiv).not.toBe(null);
    expect(errorDiv.textContent).toContain('konnte nicht geladen werden');
  });

  it('zeigt Ladefehler wenn fetch für artists.json mit Netzwerkfehler rejectet', async () => {
    app = createAuthenticatedApp();
    fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await app.init();

    const errorContainer = document.getElementById('error-container');
    const errorDiv = errorContainer.querySelector('.error-message');
    expect(errorDiv).not.toBe(null);
    expect(errorDiv.textContent).toContain('konnte nicht geladen werden');
  });

  it('zeigt Parsefehler wenn response.json() wirft (ungültiges JSON)', async () => {
    app = createAuthenticatedApp();
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => { throw new SyntaxError('Unexpected token'); },
    });

    await app.init();

    const errorContainer = document.getElementById('error-container');
    const errorDiv = errorContainer.querySelector('.error-message');
    expect(errorDiv).not.toBe(null);
    expect(errorDiv.textContent).toContain('JSON-Array');
  });

  it('zeigt Validierungsfehler wenn JSON kein Array ist (Object)', async () => {
    app = createAuthenticatedApp();
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ not: 'an array' }),
    });

    await app.init();

    const errorContainer = document.getElementById('error-container');
    const errorDiv = errorContainer.querySelector('.error-message');
    expect(errorDiv).not.toBe(null);
    expect(errorDiv.textContent.length).toBeGreaterThan(0);
  });

  it('zeigt Validierungsfehler wenn Array Nicht-String-Einträge enthält', async () => {
    app = createAuthenticatedApp();
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => [123, true, null, ...createValidArtistIds(17)],
    });

    await app.init();

    const errorContainer = document.getElementById('error-container');
    const errorDiv = errorContainer.querySelector('.error-message');
    expect(errorDiv).not.toBe(null);
    expect(errorDiv.textContent.length).toBeGreaterThan(0);
  });

  it('zeigt Validierungsfehler wenn Array leere Strings enthält', async () => {
    app = createAuthenticatedApp();
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ['', '  ', ...createValidArtistIds(18)],
    });

    await app.init();

    const errorContainer = document.getElementById('error-container');
    const errorDiv = errorContainer.querySelector('.error-message');
    expect(errorDiv).not.toBe(null);
    expect(errorDiv.textContent.length).toBeGreaterThan(0);
  });

  it('zeigt Bereichsfehler wenn JSON weniger als 20 Einträge hat', async () => {
    app = createAuthenticatedApp();
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => createValidArtistIds(5),
    });

    await app.init();

    const errorContainer = document.getElementById('error-container');
    const errorDiv = errorContainer.querySelector('.error-message');
    expect(errorDiv).not.toBe(null);
    expect(errorDiv.textContent.length).toBeGreaterThan(0);
  });

  it('zeigt Bereichsfehler wenn JSON mehr als 40 Einträge hat', async () => {
    app = createAuthenticatedApp();
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => createValidArtistIds(50),
    });

    await app.init();

    const errorContainer = document.getElementById('error-container');
    const errorDiv = errorContainer.querySelector('.error-message');
    expect(errorDiv).not.toBe(null);
    expect(errorDiv.textContent.length).toBeGreaterThan(0);
  });

  it('Grid-Container bleibt leer nach JSON-Fehler', async () => {
    app = createAuthenticatedApp();
    fetch.mockResolvedValueOnce({ ok: false, status: 404 });

    await app.init();

    const gridContainer = document.getElementById('grid-container');
    expect(gridContainer.innerHTML).toBe('');
  });
});

describe('Integration: Netzwerk-Timeout-Simulation', () => {
  let app;

  beforeEach(() => {
    document.body.innerHTML = `
      <button id="login-button" hidden>Login</button>
      <button id="logout-button" hidden>Logout</button>
      <span id="user-info" hidden></span>
      <div id="error-container"></div>
      <div id="grid-container"></div>
      <div id="player-status" hidden><span id="now-playing"></span></div>
    `;

    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
    delete window.Spotify;
  });

  it('zeigt Timeout-Fehlermeldung wenn fetch für artists.json mit AbortError rejectet', async () => {
    app = createAuthenticatedApp();
    const abortError = new DOMException('The operation was aborted.', 'AbortError');
    fetch.mockRejectedValueOnce(abortError);

    await app.init();

    const errorContainer = document.getElementById('error-container');
    const errorDiv = errorContainer.querySelector('.error-message');
    expect(errorDiv).not.toBe(null);
    expect(errorDiv.textContent).toContain('konnte nicht geladen werden');
  });

  it('entfernt Ladezustand nach Timeout', async () => {
    app = createAuthenticatedApp();
    fetch.mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'));

    await app.init();

    const gridContainer = document.getElementById('grid-container');
    expect(gridContainer.classList.contains('loading')).toBe(false);
  });
});

describe('Integration: Full Happy-Path', () => {
  let app;

  beforeEach(() => {
    document.body.innerHTML = `
      <button id="login-button" hidden>Login</button>
      <button id="logout-button" hidden>Logout</button>
      <span id="user-info" hidden></span>
      <div id="error-container"></div>
      <div id="grid-container"></div>
      <div id="player-status" hidden><span id="now-playing"></span></div>
    `;

    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
    delete window.Spotify;
  });

  it('vollständiger Flow: Restore → JSON laden → API → Grid Render', async () => {
    app = createAuthenticatedApp();

    const artistIds = createValidArtistIds(20);

    // 1. fetch artists.json (called directly by _loadGrid)
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => artistIds,
    });

    // 2. getArtists calls getArtist per ID individually via authenticatedFetch
    // authenticatedFetch is mocked to just call fetch, so we need 20 responses
    for (let i = 0; i < 20; i++) {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: artistIds[i],
          name: `Artist ${i}`,
          images: [{ url: `https://img.com/${artistIds[i]}.jpg`, width: 640, height: 640 }],
        }),
      });
    }

    await app.init();

    // Grid was rendered with 20 items
    const gridContainer = document.getElementById('grid-container');
    const items = gridContainer.querySelectorAll('.grid-item');
    expect(items.length).toBe(20);
  });

  it('erneuter Klick auf selben Künstler stoppt Wiedergabe', async () => {
    app = createAuthenticatedApp();

    const artistIds = createValidArtistIds(20);

    // 1. fetch artists.json
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => artistIds,
    });

    // 2. getArtists calls getArtist per ID individually
    for (let i = 0; i < 20; i++) {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: artistIds[i],
          name: `Artist ${i}`,
          images: [{ url: `https://img.com/${artistIds[i]}.jpg`, width: 640, height: 640 }],
        }),
      });
    }

    await app.init();

    // Mock player for playback
    app.player = {
      isPlaying: () => true,
      play: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
    };

    // Mock API findTrackUri
    vi.spyOn(app.api, 'findTrackUri').mockResolvedValue({
      trackUri: 'spotify:track:123',
      trackName: 'Test Track',
    });

    // Click artist to start
    await app.handleArtistClick('artist0');
    expect(app.currentlyPlaying).toBe('artist0');

    // Click same artist to stop
    await app.handleArtistClick('artist0');
    expect(app.currentlyPlaying).toBe(null);
    expect(app.player.stop).toHaveBeenCalled();
  });
});

describe('Integration: 401-Handling (API Error during Grid Load)', () => {
  let app;

  beforeEach(() => {
    document.body.innerHTML = `
      <button id="login-button" hidden>Login</button>
      <button id="logout-button" hidden>Logout</button>
      <span id="user-info" hidden></span>
      <div id="error-container"></div>
      <div id="grid-container"></div>
      <div id="player-status" hidden><span id="now-playing"></span></div>
    `;

    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
    delete window.Spotify;
  });

  it('zeigt Fehlermeldung wenn artists.json Fetch fehlschlägt', async () => {
    app = createAuthenticatedApp();

    // artists.json returns 401
    fetch.mockResolvedValueOnce({ ok: false, status: 401 });

    await app.init();

    const errorContainer = document.getElementById('error-container');
    const errorDiv = errorContainer.querySelector('.error-message');
    expect(errorDiv).not.toBe(null);
    expect(errorDiv.textContent).toContain('konnte nicht geladen werden');
  });

  it('Grid-Container wird bei Ladefehler geleert', async () => {
    app = createAuthenticatedApp();

    // artists.json returns 401
    fetch.mockResolvedValueOnce({ ok: false, status: 401 });

    await app.init();

    const gridContainer = document.getElementById('grid-container');
    expect(gridContainer.innerHTML).toBe('');
  });
});
