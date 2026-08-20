// Spotify Web Playback SDK Wrapper
// Erfordert Spotify Premium

/**
 * Wrapper für das Spotify Web Playback SDK.
 * Erstellt einen Player im Browser, der direkt Spotify-Tracks abspielen kann.
 */
export class SpotifyPlayer {
  /**
   * @param {import('./token-manager.js').TokenManager} tokenManager - TokenManager instance for auth
   * @param {string} name - Anzeigename des Players in Spotify Connect
   */
  constructor(tokenManager, name = 'SpotiGrid Player') {
    this._tokenManager = tokenManager;
    this._name = name;
    /** @type {Spotify.Player|null} */
    this._player = null;
    /** @type {string|null} */
    this._deviceId = null;
    /** @type {string|null} */
    this._currentTrackUri = null;
    /** @type {function|null} */
    this._onTrackEndCallback = null;
    this._ready = false;
    this._readyPromise = null;
  }

  /**
   * Initialisiert den Spotify Player.
   * Wartet bis das SDK bereit ist und der Player sich verbunden hat.
   * @returns {Promise<void>}
   */
  async connect() {
    this._readyPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Spotify Player konnte nicht initialisiert werden. Bitte Seite neu laden.'));
      }, 15000);

      window.onSpotifyWebPlaybackSDKReady = () => {
        this._player = new window.Spotify.Player({
          name: this._name,
          getOAuthToken: (cb) => cb(this._tokenManager.getAccessToken()),
          volume: 0.5,
        });

        this._player.addListener('ready', ({ device_id }) => {
          clearTimeout(timeout);
          this._deviceId = device_id;
          this._ready = true;
          resolve();
        });

        this._player.addListener('not_ready', ({ device_id }) => {
          this._ready = false;
        });

        this._player.addListener('initialization_error', ({ message }) => {
          clearTimeout(timeout);
          reject(new Error(`Player-Initialisierung fehlgeschlagen: ${message}`));
        });

        this._player.addListener('authentication_error', ({ message }) => {
          clearTimeout(timeout);
          reject(new Error('Spotify-Authentifizierung fehlgeschlagen. Bitte erneut einloggen.'));
        });

        this._player.addListener('account_error', ({ message }) => {
          clearTimeout(timeout);
          reject(new Error('Spotify Premium ist erforderlich für die Wiedergabe.'));
        });

        // Track-Ende erkennen
        this._player.addListener('player_state_changed', (state) => {
          if (!state) return;

          // Track hat sich beendet: paused=true, position=0, und der Track war vorher aktiv
          if (
            state.paused &&
            state.position === 0 &&
            this._currentTrackUri &&
            state.track_window.previous_tracks.some(
              (t) => t.uri === this._currentTrackUri
            )
          ) {
            const cb = this._onTrackEndCallback;
            this._currentTrackUri = null;
            this._onTrackEndCallback = null;
            if (cb) cb();
          }
        });

        this._player.connect();
      };

      // Falls das SDK bereits geladen ist
      if (window.Spotify) {
        window.onSpotifyWebPlaybackSDKReady();
      }
    });

    return this._readyPromise;
  }

  /**
   * Spielt einen Track über die Spotify Web API auf diesem Device ab.
   * @param {string} trackUri - Spotify Track URI (z.B. "spotify:track:xxx")
   * @param {function} [onEnded] - Callback wenn der Track endet
   */
  async play(trackUri, onEnded) {
    if (!this._ready || !this._deviceId) {
      throw new Error('Player ist nicht bereit.');
    }

    // Vorherigen onEnded-Callback entfernen
    this._onTrackEndCallback = onEnded || null;
    this._currentTrackUri = trackUri;

    const response = await this._tokenManager.authenticatedFetch(
      `https://api.spotify.com/v1/me/player/play?device_id=${this._deviceId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uris: [trackUri] }),
      }
    );

    if (response.status === 403) {
      throw new Error('Spotify Premium ist erforderlich für die Wiedergabe.');
    }

    if (!response.ok) {
      throw new Error(`Wiedergabe fehlgeschlagen: ${response.status}`);
    }
  }

  /**
   * Pausiert/Stoppt die aktuelle Wiedergabe.
   */
  async stop() {
    this._currentTrackUri = null;
    this._onTrackEndCallback = null;

    if (this._player) {
      await this._player.pause();
    }
  }

  /**
   * Gibt zurück ob der Player gerade abspielt.
   * @returns {boolean}
   */
  isPlaying() {
    return this._currentTrackUri !== null;
  }

  /**
   * Gibt die aktuelle Track-URI zurück.
   * @returns {string|null}
   */
  getCurrentTrackUri() {
    return this._currentTrackUri;
  }

  /**
   * Trennt den Player.
   */
  disconnect() {
    if (this._player) {
      this._player.disconnect();
    }
    this._ready = false;
    this._deviceId = null;
  }
}
