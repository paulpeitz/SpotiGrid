// App module - Orchestrierung aller Module

import { SpotifyAPI } from './spotify-api.js';
import { GridRenderer } from './grid-renderer.js';
import { SpotifyPlayer } from './spotify-player.js';
import { validateArtistIds } from './validate.js';
import { TokenManager } from './token-manager.js';
import { TrackCollection } from './track-collection.js';
import { TrackNavigation } from './track-navigation.js';
import { generateCodeVerifier, generateCodeChallenge, exchangeCodeForToken } from './pkce.js';
import { loadArtistsFromCache, saveArtistsToCache } from './artist-cache.js';

// ============================================================
// Konfiguration
// ============================================================
const CLIENT_ID = 'dd0303ea40b4408396351722e3d98670';
const REDIRECT_URI = window.location.origin + window.location.pathname;
const SCOPES = 'streaming user-read-email user-read-private';

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
    this.trackCollection = null;
    this.trackNavigation = null;
  }

  // ============================================================
  // Initialization & Auth
  // ============================================================

  async init() {
    const session = await this.tokenManager.restore();
    if (session) {
      await this._onAuthenticated();
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
      await this._handleAuthCode(code);
    } else {
      this._setupLoginButton();
    }
  }

  /** @private */
  async _handleAuthCode(code) {
    const codeVerifier = sessionStorage.getItem('spotify_code_verifier');
    if (!codeVerifier) {
      this.showError('Authentifizierung fehlgeschlagen. Bitte erneut einloggen.');
      this._setupLoginButton();
      return;
    }

    try {
      const tokenData = await exchangeCodeForToken(code, codeVerifier, CLIENT_ID, REDIRECT_URI);
      this.tokenManager.save(tokenData);
      sessionStorage.removeItem('spotify_code_verifier');
      window.history.replaceState(null, '', window.location.pathname);
      await this._onAuthenticated();
    } catch (err) {
      this.showError(err.message);
      this._setupLoginButton();
    }
  }

  /** @private */
  _setupLoginButton() {
    const loginButton = document.getElementById('login-button');
    if (loginButton) {
      loginButton.hidden = false;
      loginButton.addEventListener('click', () => this._login());
    }
  }

  /** @private */
  async _login() {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
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

  /** @private */
  async _onAuthenticated() {
    const loginButton = document.getElementById('login-button');
    if (loginButton) loginButton.hidden = true;

    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
      logoutButton.hidden = false;
      logoutButton.addEventListener('click', () => this.logout());
    }

    this.api = new SpotifyAPI(this.tokenManager);

    await this._loadGrid();

    try {
      this.player = new SpotifyPlayer(this.tokenManager);
      await this.player.connect();
    } catch (err) {
      this.showError(err.message);
    }

    this._setupNavigationEvents();
  }

  async logout() {
    if (this.player) {
      try {
        if (this.player.isPlaying()) await this.player.stop();
        this.player.disconnect();
      } catch (err) {
        this.showError('Abmeldung fehlgeschlagen: ' + err.message);
        return;
      }
    }

    this.trackCollection = null;
    this.trackNavigation = null;
    this.tokenManager.clear();

    const ids = ['login-button', 'logout-button', 'grid-container', 'now-playing', 'player-status'];
    const loginButton = document.getElementById('login-button');
    const gridContainer = document.getElementById(this.config.gridContainerId);
    const nowPlaying = document.getElementById('now-playing');
    const playerStatus = document.getElementById('player-status');
    const logoutButton = document.getElementById('logout-button');
    const userInfo = document.getElementById('user-info');

    if (loginButton) loginButton.hidden = false;
    if (logoutButton) logoutButton.hidden = true;
    if (userInfo) userInfo.hidden = true;
    if (gridContainer) gridContainer.innerHTML = '';
    if (nowPlaying) nowPlaying.textContent = '';
    if (playerStatus) playerStatus.hidden = true;

    this.currentlyPlaying = null;
    this.artists = [];
    this.api = null;
    this.player = null;
  }

  // ============================================================
  // Grid Loading
  // ============================================================

  /** @private */
  async _loadGrid() {
    const gridContainer = document.getElementById(this.config.gridContainerId);
    if (gridContainer) {
      gridContainer.classList.add('loading');
      gridContainer.innerHTML = '<div class="loading-indicator">Laden…</div>';
    }

    try {
      const json = await this._fetchArtistsJson();
      const validationResult = validateArtistIds(json);
      if (validationResult && validationResult.valid === false) {
        throw new Error(validationResult.error);
      }

      const artistIds = validationResult.map(entry => entry.id);
      let artists = loadArtistsFromCache(artistIds);

      if (!artists) {
        artists = await this.api.getArtists(artistIds);
        saveArtistsToCache(artistIds, artists);
      }

      // Enrich with date field
      const dateMap = new Map(
        validationResult.filter(e => e.date).map(e => [e.id, e.date])
      );
      this.artists = artists.map(artist => {
        const date = dateMap.get(artist.id);
        return date ? { ...artist, date } : artist;
      });

      this.renderer = new GridRenderer(gridContainer);
      this.renderer.render(this.artists);
      this._setupGridEvents(gridContainer);
    } catch (err) {
      this.showError(err.message);
      if (gridContainer) gridContainer.innerHTML = '';
    } finally {
      if (gridContainer) gridContainer.classList.remove('loading');
    }
  }

  /** @private */
  async _fetchArtistsJson() {
    let response;
    try {
      response = await fetch(this.config.artistsJsonPath);
    } catch (err) {
      throw new Error('Die Künstlerdatei konnte nicht geladen werden.');
    }
    if (!response.ok) throw new Error('Die Künstlerdatei konnte nicht geladen werden.');

    try {
      return await response.json();
    } catch (err) {
      throw new Error('Die Datei muss ein JSON-Array mit Spotify Artist ID Strings enthalten.');
    }
  }

  // ============================================================
  // Event Setup
  // ============================================================

  /** @private */
  _setupGridEvents(gridContainer) {
    gridContainer.addEventListener('click', (event) => {
      const gridItem = event.target.closest('.grid-item');
      if (!gridItem || gridItem.classList.contains('no-preview')) return;
      const artistId = gridItem.dataset.artistId;
      if (artistId) this.handleArtistClick(artistId);
    });
  }

  /** @private */
  _setupNavigationEvents() {
    const backControl = document.getElementById('back-control');
    const stopControl = document.getElementById('stop-control');
    const forwardControl = document.getElementById('forward-control');

    if (backControl) backControl.addEventListener('click', () => this._navigateTrack('back'));
    if (stopControl) stopControl.addEventListener('click', () => this._stopPlayback());
    if (forwardControl) forwardControl.addEventListener('click', () => this._navigateTrack('forward'));
  }

  // ============================================================
  // Playback
  // ============================================================

  async handleArtistClick(artistId) {
    if (this.currentlyPlaying === artistId) {
      await this._stopPlayback();
      return;
    }

    if (this.currentlyPlaying !== null) {
      await this._stopPlayback();
    }

    const artist = this.artists.find(a => a.id === artistId);
    if (!artist) return;

    try {
      const tracks = await this.api.getArtistTopTracks(artistId, 5, artist.name);

      if (!tracks || tracks.length === 0) {
        await this._playLegacyTrack(artist, artistId);
        return;
      }

      this.trackCollection = new TrackCollection(tracks);
      this.trackNavigation = new TrackNavigation(this.trackCollection);

      const track = this.trackNavigation.getCurrentTrack();
      if (!track) {
        await this._playLegacyTrack(artist, artistId);
        return;
      }

      await this.player.play(track.uri, () => this._handlePlaybackEnd(artistId));
      this.renderer.showOverlay(artistId);
      this.currentlyPlaying = artistId;
      this._updateNowPlaying(`${artist.name} – ${track.name}`);
      this._updateNavigationControls();
    } catch (err) {
      await this._stopPlayback();
      this.showError(err.message);
    }
  }

  /** @private */
  async _playLegacyTrack(artist, artistId) {
    try {
      const result = await this.api.findTrackUri(artist.name);
      if (!result) {
        this.renderer.markNoPreview(artistId);
        await this._stopPlayback();
        return;
      }

      await this.player.play(result.trackUri, () => this._handlePlaybackEnd(artistId));
      this.renderer.showOverlay(artistId);
      this.currentlyPlaying = artistId;
      this._updateNowPlaying(`${artist.name} – ${result.trackName}`);
      this._updateNavigationControls();
    } catch (err) {
      await this._stopPlayback();
      this.showError(err.message);
    }
  }

  // ============================================================
  // Track Navigation (consolidated forward/back)
  // ============================================================

  /**
   * Navigates to the next or previous track.
   * @param {'forward'|'back'} direction
   * @private
   */
  async _navigateTrack(direction) {
    if (!this.trackNavigation || !this.trackNavigation.canNavigate()) return;

    const artistId = this.currentlyPlaying;
    const artist = this.artists.find(a => a.id === artistId);
    if (!artist) return;

    const track = direction === 'forward'
      ? this.trackNavigation.forward()
      : this.trackNavigation.back();
    if (!track) return;

    try {
      await this.player.stop();
      await this.player.play(track.uri, () => this._handlePlaybackEnd(artistId));
      this._updateNowPlaying(`${artist.name} – ${track.name}`);
    } catch (err) {
      if (err.message && err.message.includes('401')) {
        await this._stopPlayback();
        this.showError('Sitzung abgelaufen. Bitte erneut einloggen.');
        this._login();
        return;
      }
      await this._stopPlayback();
      this.showError(err.message);
    }
  }

  // ============================================================
  // Playback State Management
  // ============================================================

  /** @private */
  _updateNavigationControls() {
    const backBtn = document.getElementById('back-control');
    const forwardBtn = document.getElementById('forward-control');
    const canNavigate = this.trackNavigation && this.trackNavigation.canNavigate();

    if (backBtn) backBtn.disabled = !canNavigate;
    if (forwardBtn) forwardBtn.disabled = !canNavigate;
  }

  /** @private */
  async _stopPlayback() {
    if (this.player && this.player.isPlaying()) {
      await this.player.stop();
    }

    const previousArtistId = this.currentlyPlaying;
    this.trackCollection = null;
    this.trackNavigation = null;
    this.currentlyPlaying = null;

    if (previousArtistId && this.renderer) {
      this.renderer.hideOverlay(previousArtistId);
    }

    this._updateNowPlaying(null);
  }

  /** @private */
  _handlePlaybackEnd(artistId) {
    if (this.renderer) this.renderer.hideOverlay(artistId);
    this._stopPlayback();
  }

  // ============================================================
  // UI Updates
  // ============================================================

  /** @private */
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

  showError(message) {
    const errorContainer = document.getElementById(this.config.errorContainerId);
    if (!errorContainer) return;
    errorContainer.innerHTML = '';
    const errorDiv = document.createElement('div');
    errorDiv.classList.add('error-message');
    errorDiv.textContent = message;
    errorContainer.appendChild(errorDiv);
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
