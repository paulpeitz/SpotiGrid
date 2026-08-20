// App module - Orchestrierung aller Module (Web Playback SDK + PKCE)

import { SpotifyAPI } from './spotify-api.js';
import { GridRenderer } from './grid-renderer.js';
import { SpotifyPlayer } from './spotify-player.js';
import { validateArtistIds } from './validate.js';
import { TokenManager } from './token-manager.js';
import { TrackCollection } from './track-collection.js';
import { TrackNavigation } from './track-navigation.js';

// ============================================================
// OAuth Konfiguration (Authorization Code Flow mit PKCE)
// ============================================================
// WICHTIG: Ersetze CLIENT_ID mit deiner Spotify App Client ID
const CLIENT_ID = 'dd0303ea40b4408396351722e3d98670';
const REDIRECT_URI = window.location.origin + window.location.pathname;
const SCOPES = 'streaming user-read-email user-read-private';

// ============================================================
// PKCE Helper-Funktionen
// ============================================================

/**
 * Generiert einen zufälligen Code Verifier (43-128 Zeichen).
 */
function generateCodeVerifier() {
  const array = new Uint8Array(64);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Berechnet den Code Challenge aus dem Code Verifier (S256).
 */
async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Tauscht den Authorization Code gegen ein Access Token.
 */
async function exchangeCodeForToken(code, codeVerifier) {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error_description || 'Token-Austausch fehlgeschlagen.');
  }

  return response.json();
}

// ============================================================
// App Klasse
// ============================================================

/**
 * Orchestriert alle Module und verwaltet den App-Zustand.
 */
export class App {
  constructor(config) {
    this.config = config;
    this.api = null;
    this.renderer = null;
    this.player = null;
    this.artists = [];
    this.currentlyPlaying = null;
    this.tokenManager = new TokenManager({ clientId: CLIENT_ID });
    // Track navigation support
    this.trackCollection = null;
    this.trackNavigation = null;
  }

  /**
   * Initialisiert die App: Prüft ob ein Auth-Code in der URL ist (nach Redirect).
   */
  async init() {
    // Try to restore existing session
    const session = await this.tokenManager.restore();
    if (session) {
      await this._onAuthenticated();
      return;
    }

    // No valid session — check for auth code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
      // Code gegen Token tauschen
      const codeVerifier = sessionStorage.getItem('spotify_code_verifier');
      if (!codeVerifier) {
        this.showError('Authentifizierung fehlgeschlagen. Bitte erneut einloggen.');
        this._setupLoginButton();
        return;
      }

      try {
        const tokenData = await exchangeCodeForToken(code, codeVerifier);
        this.tokenManager.save(tokenData);
        sessionStorage.removeItem('spotify_code_verifier');

        // URL bereinigen
        window.history.replaceState(null, '', window.location.pathname);

        await this._onAuthenticated();
      } catch (err) {
        this.showError(err.message);
        this._setupLoginButton();
      }
    } else {
      // Login-Button zeigen
      this._setupLoginButton();
    }
  }

  /**
   * Registriert den Login-Button für den OAuth-Flow.
   */
  _setupLoginButton() {
    const loginButton = document.getElementById('login-button');
    if (loginButton) {
      loginButton.hidden = false;
      loginButton.addEventListener('click', () => this._login());
    }
  }

  /**
   * Startet den Spotify OAuth Authorization Code Flow mit PKCE.
   */
  async _login() {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // Code Verifier speichern (wird nach Redirect benötigt)
    sessionStorage.setItem('spotify_code_verifier', codeVerifier);

    const authUrl = new URL('https://accounts.spotify.com/authorize');
    authUrl.searchParams.set('client_id', CLIENT_ID);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('scope', SCOPES);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('code_challenge', codeChallenge);

    window.location.href = authUrl.toString();
  }

  /**
   * Wird aufgerufen wenn ein Token vorhanden ist.
   */
  async _onAuthenticated() {
    // Login-Button ausblenden
    const loginButton = document.getElementById('login-button');
    if (loginButton) loginButton.hidden = true;

    // Logout-Button anzeigen und Handler registrieren
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
      logoutButton.hidden = false;
      logoutButton.addEventListener('click', () => this.logout());
    }

    // User-Info verborgen halten
    const userInfo = document.getElementById('user-info');
    if (userInfo) {
      userInfo.textContent = '✓ Verbunden';
      userInfo.hidden = true;
    }

    // API-Instanz erstellen
    this.api = new SpotifyAPI(this.tokenManager);

    // Grid laden (unabhängig vom Player-Status)
    await this._loadGrid();

    // Player initialisieren
    try {
      this.player = new SpotifyPlayer(this.tokenManager);
      await this.player.connect();
    } catch (err) {
      this.showError(err.message);
    }

    // Navigation-Buttons registrieren
    this._setupNavigationEvents();
  }

  /**
   * Logs the user out: stops playback, clears session data, resets UI.
   * Handles cleanup failures gracefully per Requirement 6.5.
   */
  async logout() {
    let cleanupError = null;

    // Stop active playback and clean up track collection
    if (this.player) {
      try {
        if (this.player.isPlaying()) {
          await this.player.stop();
        }
        this.player.disconnect();
      } catch (err) {
        cleanupError = err;
      }
    }

    // Clean up track collection
    this.trackCollection = null;
    this.trackNavigation = null;

    // Clear session data
    this.tokenManager.clear();

    // Reset UI
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const userInfo = document.getElementById('user-info');
    const gridContainer = document.getElementById(this.config.gridContainerId);
    const nowPlaying = document.getElementById('now-playing');
    const playerStatus = document.getElementById('player-status');

    if (loginButton) loginButton.hidden = false;
    if (logoutButton) logoutButton.hidden = true;
    if (userInfo) userInfo.hidden = true;
    if (gridContainer) gridContainer.innerHTML = '';
    if (nowPlaying) nowPlaying.textContent = '';
    if (playerStatus) playerStatus.hidden = true;

    // Handle cleanup failure - leave state unchanged and show error (Requirement 6.5)
    if (cleanupError) {
      this.showError('Abmeldung fehlgeschlagen: ' + cleanupError.message);
      return;
    }

    this.currentlyPlaying = null;
    this.artists = [];
    this.api = null;
    this.player = null;
  }

  /**
   * Lädt Artist-Daten und rendert das Grid.
   * Nutzt localStorage-Cache um Rate-Limiting zu vermeiden.
   */
  async _loadGrid() {
    const gridContainer = document.getElementById(this.config.gridContainerId);
    if (gridContainer) {
      gridContainer.classList.add('loading');
      gridContainer.innerHTML = '<div class="loading-indicator">Laden…</div>';
    }

    try {
      let response;
      try {
        response = await fetch(this.config.artistsJsonPath);
      } catch (err) {
        throw new Error('Die Künstlerdatei konnte nicht geladen werden.');
      }

      if (!response.ok) {
        throw new Error('Die Künstlerdatei konnte nicht geladen werden.');
      }

      let json;
      try {
        json = await response.json();
      } catch (err) {
        throw new Error('Die Datei muss ein JSON-Array mit Spotify Artist ID Strings enthalten.');
      }

      const validationResult = validateArtistIds(json);
      if (validationResult && validationResult.valid === false) {
        throw new Error(validationResult.error);
      }

      // Extrahiere ID-Strings für den API-Aufruf
      const artistIds = validationResult.map(entry => entry.id);

      // Versuche gecachte Künstlerdaten zu laden
      let artists = this._loadArtistsFromCache(artistIds);

      if (!artists) {
        // Kein Cache oder veraltet — von API laden
        artists = await this.api.getArtists(artistIds);
        // Cache speichern (24h gültig)
        this._saveArtistsToCache(artistIds, artists);
      }

      // Reichere die API-Ergebnisse mit dem date-Feld aus den normalisierten Objekten an
      const dateMap = new Map(
        validationResult
          .filter(entry => entry.date)
          .map(entry => [entry.id, entry.date])
      );

      const enrichedArtists = artists.map(artist => {
        const date = dateMap.get(artist.id);
        if (date) {
          return { ...artist, date };
        }
        return artist;
      });

      this.artists = enrichedArtists;

      this.renderer = new GridRenderer(gridContainer);
      this.renderer.render(enrichedArtists);
      this._setupEvents(gridContainer);
    } catch (err) {
      this.showError(err.message);
      if (gridContainer) {
        gridContainer.innerHTML = '';
      }
    } finally {
      if (gridContainer) {
        gridContainer.classList.remove('loading');
      }
    }
  }

  /**
   * Registriert Event-Delegation auf dem Grid-Container.
   */
  _setupEvents(gridContainer) {
    gridContainer.addEventListener('click', (event) => {
      const gridItem = event.target.closest('.grid-item');
      if (!gridItem) return;
      if (gridItem.classList.contains('no-preview')) return;

      const artistId = gridItem.dataset.artistId;
      if (artistId) {
        this.handleArtistClick(artistId);
      }
    });
  }

  /**
   * Registriert Event-Handler für die Navigation-Buttons.
   */
  _setupNavigationEvents() {
    const backControl = document.getElementById('back-control');
    const forwardControl = document.getElementById('forward-control');
    const stopControl = document.getElementById('stop-control');

    if (backControl) {
      backControl.addEventListener('click', () => this._handleBack());
    }

    if (stopControl) {
      stopControl.addEventListener('click', () => this._stopPlayback());
    }

    if (forwardControl) {
      forwardControl.addEventListener('click', () => this._handleForward());
    }
  }

  /**
   * Behandelt Klick auf ein Künstlerbild.
   */
  async handleArtistClick(artistId) {
    // Toggle: gleicher Künstler → Stop
    if (this.currentlyPlaying === artistId) {
      await this._stopPlayback();
      return;
    }

    // Anderer Künstler spielt → zuerst stoppen
    if (this.currentlyPlaying !== null) {
      await this._stopPlayback();
    }

    const artist = this.artists.find((a) => a.id === artistId);
    if (!artist) return;

    try {
      // Fetch top tracks for the artist (via Search API)
      const tracks = await this.api.getArtistTopTracks(artistId, 5, artist.name);
      console.log('[SpotiGrid] Top-Tracks für', artist.name, ':', tracks.length, 'Tracks');

      // If no top tracks, fall back to findTrackUri for backward compatibility
      if (!tracks || tracks.length === 0) {
        await this._playLegacyTrack(artist, artistId);
        return;
      }

      // Create track collection and navigation
      this.trackCollection = new TrackCollection(tracks);
      this.trackNavigation = new TrackNavigation(this.trackCollection);

      // Get first track
      const track = this.trackNavigation.getCurrentTrack();
      if (!track) {
        await this._playLegacyTrack(artist, artistId);
        return;
      }

      // Setup playback with onEnded callback
      const onEnded = () => {
        this._handlePlaybackEnd(artistId);
      };

      await this.player.play(track.uri, onEnded);
      this.renderer.showOverlay(artistId);
      this.currentlyPlaying = artistId;
      this._updateNowPlaying(`${artist.name} – ${track.name}`);
      this._updateNavigationControls();
    } catch (err) {
      await this._stopPlayback();
      this.showError(err.message);
    }
  }

  /**
   * Plays a track using the legacy findTrackUri method (backward compatibility).
   * @param {Object} artist - Artist object
   * @param {string} artistId - Artist ID
   */
  async _playLegacyTrack(artist, artistId) {
    try {
      const result = await this.api.findTrackUri(artist.name);

      if (!result) {
        this.renderer.markNoPreview(artistId);
        await this._stopPlayback();
        return;
      }

      const onEnded = () => {
        this._handlePlaybackEnd(artistId);
      };

      await this.player.play(result.trackUri, onEnded);
      this.renderer.showOverlay(artistId);
      this.currentlyPlaying = artistId;
      this._updateNowPlaying(`${artist.name} – ${result.trackName}`);
      this._updateNavigationControls();
    } catch (err) {
      await this._stopPlayback();
      this.showError(err.message);
    }
  }

  /**
   * Checks if an error is due to authentication failure (401).
   * @param {Error} error - The error to check
   * @returns {boolean}
   */
  _isAuthError(error) {
    return error.message && error.message.includes('401');
  }

  /**
   * Handles forward navigation to the next track.
   */
  async _handleForward() {
    console.log('[SpotiGrid] Forward geklickt, trackNavigation:', !!this.trackNavigation, 'canNavigate:', this.trackNavigation?.canNavigate());
    if (!this.trackNavigation || !this.trackNavigation.canNavigate()) {
      return;
    }

    const artistId = this.currentlyPlaying;
    const artist = this.artists.find((a) => a.id === artistId);
    if (!artist) return;

    // Navigate to next track
    const track = this.trackNavigation.forward();
    if (!track) return;

    // Stop current track and play new one
    try {
      await this.player.stop();

      const onEnded = () => {
        this._handlePlaybackEnd(artistId);
      };

      await this.player.play(track.uri, onEnded);
      this._updateNowPlaying(`${artist.name} – ${track.name}`);
    } catch (err) {
      // Check for auth error (401) and trigger re-authentication
      if (this._isAuthError(err)) {
        await this._stopPlayback();
        this.showError('Sitzung abgelaufen. Bitte erneut einloggen.');
        this._login();
        return;
      }
      await this._stopPlayback();
      this.showError(err.message);
    }
  }

  /**
   * Handles back navigation to the previous track.
   */
  async _handleBack() {
    console.log('[SpotiGrid] Back geklickt, trackNavigation:', !!this.trackNavigation, 'canNavigate:', this.trackNavigation?.canNavigate());
    if (!this.trackNavigation || !this.trackNavigation.canNavigate()) {
      return;
    }

    const artistId = this.currentlyPlaying;
    const artist = this.artists.find((a) => a.id === artistId);
    if (!artist) return;

    // Navigate to previous track
    const track = this.trackNavigation.back();
    if (!track) return;

    // Stop current track and play new one
    try {
      await this.player.stop();

      const onEnded = () => {
        this._handlePlaybackEnd(artistId);
      };

      await this.player.play(track.uri, onEnded);
      this._updateNowPlaying(`${artist.name} – ${track.name}`);
    } catch (err) {
      // Check for auth error (401) and trigger re-authentication
      if (this._isAuthError(err)) {
        await this._stopPlayback();
        this.showError('Sitzung abgelaufen. Bitte erneut einloggen.');
        this._login();
        return;
      }
      await this._stopPlayback();
      this.showError(err.message);
    }
  }

  /**
   * Updates navigation button enabled/disabled state based on track collection.
   */
  _updateNavigationControls() {
    const backBtn = document.getElementById('back-control');
    const forwardBtn = document.getElementById('forward-control');

    const canNavigate = this.trackNavigation && this.trackNavigation.canNavigate();

    if (backBtn) {
      backBtn.disabled = !canNavigate;
    }
    if (forwardBtn) {
      forwardBtn.disabled = !canNavigate;
    }
  }

  /**
   * Stops playback and cleans up track collection.
   */
  async _stopPlayback() {
    if (this.player && this.player.isPlaying()) {
      await this.player.stop();
    }

    const previousArtistId = this.currentlyPlaying;

    // Clean up track collection
    this.trackCollection = null;
    this.trackNavigation = null;
    this.currentlyPlaying = null;

    // Hide overlay for previous artist
    if (previousArtistId && this.renderer) {
      this.renderer.hideOverlay(previousArtistId);
    }

    // Hide player-status and clear now-playing
    this._updateNowPlaying(null);
  }

  /**
   * Handles playback end event.
   */
  _handlePlaybackEnd(artistId) {
    if (this.renderer) {
      this.renderer.hideOverlay(artistId);
    }
    this._stopPlayback();
  }

  /**
   * Aktualisiert die "Now Playing"-Anzeige.
   */
  _updateNowPlaying(text) {
    const status = document.getElementById('player-status');
    const nowPlaying = document.getElementById('now-playing');
    if (status && nowPlaying) {
      if (text) {
        nowPlaying.textContent = `♪ ${text}`;
        status.hidden = false;
      } else {
        nowPlaying.textContent = '';
        status.hidden = true;
      }
    }
  }

  /**
   * Zeigt eine Fehlermeldung an.
   */
  showError(message) {
    const errorContainer = document.getElementById(this.config.errorContainerId);
    if (!errorContainer) return;

    errorContainer.innerHTML = '';
    const errorDiv = document.createElement('div');
    errorDiv.classList.add('error-message');
    errorDiv.textContent = message;
    errorContainer.appendChild(errorDiv);
  }

  /**
   * Lädt gecachte Künstlerdaten aus localStorage.
   * Gibt null zurück wenn kein Cache vorhanden, veraltet (>24h), oder IDs nicht übereinstimmen.
   * @param {string[]} artistIds - Erwartete Artist IDs
   * @returns {Array|null}
   */
  _loadArtistsFromCache(artistIds) {
    try {
      const cached = localStorage.getItem('spotigrid_artists_cache');
      if (!cached) return null;

      const { data, ids, timestamp } = JSON.parse(cached);

      // Cache älter als 24 Stunden → ungültig
      const CACHE_TTL = 24 * 60 * 60 * 1000;
      if (Date.now() - timestamp > CACHE_TTL) return null;

      // IDs haben sich geändert → ungültig
      if (!ids || ids.join(',') !== artistIds.join(',')) return null;

      // Daten müssen vorhanden sein
      if (!Array.isArray(data) || data.length === 0) return null;

      return data;
    } catch (e) {
      return null;
    }
  }

  /**
   * Speichert Künstlerdaten im localStorage-Cache.
   * @param {string[]} artistIds - Artist IDs
   * @param {Array} artists - Artist-Daten
   */
  _saveArtistsToCache(artistIds, artists) {
    try {
      const cacheEntry = {
        data: artists,
        ids: artistIds,
        timestamp: Date.now(),
      };
      localStorage.setItem('spotigrid_artists_cache', JSON.stringify(cacheEntry));
    } catch (e) {
      // localStorage voll oder nicht verfügbar — kein Problem
    }
  }
}

// ============================================================
// App initialisieren
// ============================================================
const app = new App({
  artistsJsonPath: 'artists.json',
  gridContainerId: 'grid-container',
  errorContainerId: 'error-container',
});

app.init();
