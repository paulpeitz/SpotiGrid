// Spotify API module - API-Kommunikation

const BASE_URL = 'https://api.spotify.com/v1';
const TIMEOUT_MS = 10000;

/**
 * Wählt das Bild mit der größten Breite aus dem images-Array.
 * @param {Array<{url: string, width: number, height: number}>} images
 * @returns {string|null} URL des höchstauflösenden Bildes oder null
 */
export function selectLargestImage(images) {
  if (!images || images.length === 0) {
    return null;
  }

  let largest = images[0];
  for (let i = 1; i < images.length; i++) {
    if (images[i].width > largest.width) {
      largest = images[i];
    }
  }
  return largest.url;
}

/**
 * Klasse für die Kommunikation mit der Spotify Web API.
 */
export class SpotifyAPI {
  /**
   * @param {Object|Function} tokenManagerOrFetchFn - Either a TokenManager instance
   *   (with an authenticatedFetch method) or a plain fetch function (url, opts) => Promise<Response>
   */
  constructor(tokenManagerOrFetchFn) {
    if (typeof tokenManagerOrFetchFn === 'function') {
      this._fetchFn = tokenManagerOrFetchFn;
    } else {
      this._fetchFn = (url, opts) => tokenManagerOrFetchFn.authenticatedFetch(url, opts);
    }
  }

  /**
   * Ruft Künstlerdaten für eine einzelne ID ab.
   * @param {string} artistId - Spotify Artist ID
   * @returns {Promise<{id: string, name: string, imageUrl: string|null}|null>}
   * @throws {Error} bei Auth- oder Timeout-Fehlern
   */
  async getArtist(artistId) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await this._fetchFn(`${BASE_URL}/artists/${artistId}`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Spotify API Fehler: ${response.status}`);
      }

      const data = await response.json();

      return {
        id: data.id,
        name: data.name,
        imageUrl: selectLargestImage(data.images),
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error(
          'Die Spotify API ist nicht erreichbar. Bitte Internetverbindung prüfen.'
        );
      }

      throw error;
    }
  }

  /**
   * Ruft Künstlerdaten für mehrere IDs ab.
   * Nutzt den Batch-Endpunkt /artists?ids= (max 50 pro Request).
   * Bei 403 fällt es auf Einzelabfragen zurück.
   * @param {string[]} artistIds - Array von Spotify Artist IDs
   * @returns {Promise<Array<{id: string, name: string, imageUrl: string|null}>>}
   */
  async getArtists(artistIds) {
    if (!artistIds || artistIds.length === 0) return [];

    // Versuch Batch-Request
    try {
      const result = await this._getArtistsBatch(artistIds);
      if (result !== null) return result;
    } catch (e) {
      // Fallback auf Einzelabfragen
    }

    // Fallback: Einzelne Requests mit Verzögerung
    return this._getArtistsSequential(artistIds);
  }

  /**
   * Batch-Abfrage über /artists?ids=
   * @returns {Array|null} null bei 403/Fehler (Fallback nötig)
   */
  async _getArtistsBatch(artistIds) {
    const allArtists = [];

    for (let i = 0; i < artistIds.length; i += 50) {
      const batch = artistIds.slice(i, i + 50);
      const ids = batch.join(',');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const response = await this._fetchFn(`${BASE_URL}/artists?ids=${ids}`, {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // 403 = Batch nicht erlaubt, Fallback nötig
        if (response.status === 403) {
          return null;
        }

        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '2', 10);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));

          const retryController = new AbortController();
          const retryTimeoutId = setTimeout(() => retryController.abort(), TIMEOUT_MS);
          const retryResponse = await this._fetchFn(`${BASE_URL}/artists?ids=${ids}`, {
            signal: retryController.signal,
          });
          clearTimeout(retryTimeoutId);

          if (retryResponse.ok) {
            const data = await retryResponse.json();
            const artists = (data.artists || [])
              .filter(a => a !== null)
              .map(a => ({ id: a.id, name: a.name, imageUrl: selectLargestImage(a.images) }));
            allArtists.push(...artists);
          }
          continue;
        }

        if (!response.ok) {
          return null;
        }

        const data = await response.json();
        const artists = (data.artists || [])
          .filter(a => a !== null)
          .map(a => ({ id: a.id, name: a.name, imageUrl: selectLargestImage(a.images) }));
        allArtists.push(...artists);
      } catch (error) {
        clearTimeout(timeoutId);
        return null;
      }
    }

    return allArtists;
  }

  /**
   * Fallback: Einzelne Requests mit 200ms Abstand um Rate-Limiting zu vermeiden.
   */
  async _getArtistsSequential(artistIds) {
    const results = [];

    for (const id of artistIds) {
      try {
        const artist = await this.getArtist(id);
        if (artist) results.push(artist);
      } catch (e) {
        // Skip failed artist
      }
      // Kurze Pause zwischen Requests
      if (artistIds.indexOf(id) < artistIds.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return results;
  }

  /**
   * Sucht einen Track mit preview_url für einen Künstler (Legacy).
   * @param {string} artistName - Name des Künstlers
   * @returns {Promise<{previewUrl: string, trackName: string}|null>}
   * @throws {Error} bei Auth- oder Timeout-Fehlern
   */
  async findPreviewTrack(artistName) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const query = encodeURIComponent(`artist:${artistName}`);
      const response = await this._fetchFn(
        `${BASE_URL}/search?q=${query}&type=track`,
        {
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      const items = data.tracks && data.tracks.items;
      if (!items || items.length === 0) {
        return null;
      }

      const trackWithPreview = items.find(
        (item) => item.preview_url !== null
      );

      if (!trackWithPreview) {
        return null;
      }

      return {
        previewUrl: trackWithPreview.preview_url,
        trackName: trackWithPreview.name,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error(
          'Die Spotify API ist nicht erreichbar. Bitte Internetverbindung prüfen.'
        );
      }

      throw error;
    }
  }

  /**
   * Sucht einen Track für einen Künstler und gibt die Track-URI zurück.
   * Verwendet die Spotify Search API – gibt den ersten Track zurück.
   * @param {string} artistName - Name des Künstlers
   * @returns {Promise<{trackUri: string, trackName: string}|null>}
   * @throws {Error} bei Auth- oder Timeout-Fehlern
   */
  async findTrackUri(artistName) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const query = encodeURIComponent(`artist:${artistName}`);
      const response = await this._fetchFn(
        `${BASE_URL}/search?q=${query}&type=track&limit=1`,
        {
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      const items = data.tracks && data.tracks.items;
      if (!items || items.length === 0) {
        return null;
      }

      return {
        trackUri: items[0].uri,
        trackName: items[0].name,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error(
          'Die Spotify API ist nicht erreichbar. Bitte Internetverbindung prüfen.'
        );
      }

      throw error;
    }
  }

  /**
   * Prüft, ob ein Track gültig ist (nicht leerer Name, gültige URI).
   * @param {Object} track - Spotify Track Object
   * @returns {boolean}
   */
  _isValidTrack(track) {
    if (!track) return false;
    const name = track.name;
    const uri = track.uri;
    return (
      typeof name === 'string' &&
      name.trim().length > 0 &&
      typeof uri === 'string' &&
      uri.startsWith('spotify:track:')
    );
  }

  /**
   * Ruft bis zu 5 Tracks für einen Künstler ab.
   * Nutzt die Search API statt /top-tracks (zuverlässiger).
   * @param {string} artistId - Spotify Artist ID
   * @param {number} maxSize - Maximale Anzahl zurückzugebender Tracks (Standard: 5)
   * @param {string} [artistName] - Künstlername für die Suche (optional, wird bei Bedarf nachgeladen)
   * @returns {Promise<Array<{uri: string, name: string}>>} Array gültiger Tracks
   */
  async getArtistTopTracks(artistId, maxSize = 5, artistName = null) {
    // Künstlername wird für die Search API benötigt
    let name = artistName;
    if (!name) {
      try {
        const artist = await this.getArtist(artistId);
        if (!artist) return [];
        name = artist.name;
      } catch (e) {
        return [];
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const query = encodeURIComponent(`artist:${name}`);
      const response = await this._fetchFn(
        `${BASE_URL}/search?q=${query}&type=track&limit=${maxSize * 2}`,
        {
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(
          `Spotify API Fehler beim Laden der Tracks: ${response.status}`
        );
        return [];
      }

      const data = await response.json();

      const items = (data.tracks && data.tracks.items) || [];

      // Filter zu gültigen Tracks und begrenzen auf maxSize
      const validTracks = [];
      const seenUris = new Set();

      for (const track of items) {
        if (validTracks.length >= maxSize) break;
        if (this._isValidTrack(track) && !seenUris.has(track.uri)) {
          seenUris.add(track.uri);
          validTracks.push({
            uri: track.uri,
            name: track.name,
          });
        }
      }

      return validTracks;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        console.error('Timeout beim Laden der Tracks');
      } else {
        console.error('Fehler beim Laden der Tracks:', error.message);
      }

      return [];
    }
  }
}
