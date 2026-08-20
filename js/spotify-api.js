// Spotify API module - API-Kommunikation

import { isValidTrack } from './track-utils.js';

const BASE_URL = 'https://api.spotify.com/v1';
const TIMEOUT_MS = 10000;

/**
 * Wählt das Bild mit der größten Breite aus dem images-Array.
 * @param {Array<{url: string, width: number, height: number}>} images
 * @returns {string|null}
 */
export function selectLargestImage(images) {
  if (!images || images.length === 0) return null;
  let largest = images[0];
  for (let i = 1; i < images.length; i++) {
    if (images[i].width > largest.width) largest = images[i];
  }
  return largest.url;
}

/**
 * Klasse für die Kommunikation mit der Spotify Web API.
 */
export class SpotifyAPI {
  /**
   * @param {Object|Function} tokenManagerOrFetchFn - TokenManager instance or plain fetch function
   */
  constructor(tokenManagerOrFetchFn) {
    if (typeof tokenManagerOrFetchFn === 'function') {
      this._fetchFn = tokenManagerOrFetchFn;
    } else {
      this._fetchFn = (url, opts) => tokenManagerOrFetchFn.authenticatedFetch(url, opts);
    }
  }

  /**
   * Fetch with AbortController timeout.
   * @param {string} url
   * @param {RequestInit} [opts]
   * @returns {Promise<Response>}
   */
  async _fetchWithTimeout(url, opts = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await this._fetchFn(url, { ...opts, signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Die Spotify API ist nicht erreichbar. Bitte Internetverbindung prüfen.');
      }
      throw error;
    }
  }

  /**
   * Ruft Künstlerdaten für eine einzelne ID ab.
   * @param {string} artistId
   * @returns {Promise<{id: string, name: string, imageUrl: string|null}|null>}
   */
  async getArtist(artistId) {
    const response = await this._fetchWithTimeout(`${BASE_URL}/artists/${artistId}`);

    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Spotify API Fehler: ${response.status}`);

    const data = await response.json();
    return {
      id: data.id,
      name: data.name,
      imageUrl: selectLargestImage(data.images),
    };
  }

  /**
   * Ruft Künstlerdaten für mehrere IDs ab.
   * Nutzt Batch-Endpunkt mit Fallback auf Einzelabfragen.
   * @param {string[]} artistIds
   * @returns {Promise<Array<{id: string, name: string, imageUrl: string|null}>>}
   */
  async getArtists(artistIds) {
    if (!artistIds || artistIds.length === 0) return [];

    try {
      const result = await this._getArtistsBatch(artistIds);
      if (result !== null) return result;
    } catch (e) {
      // Fallback
    }

    return this._getArtistsSequential(artistIds);
  }

  /** @private */
  async _getArtistsBatch(artistIds) {
    const allArtists = [];

    for (let i = 0; i < artistIds.length; i += 50) {
      const ids = artistIds.slice(i, i + 50).join(',');
      const response = await this._fetchWithTimeout(`${BASE_URL}/artists?ids=${ids}`);

      if (response.status === 403) return null;

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '2', 10);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        const retryResponse = await this._fetchWithTimeout(`${BASE_URL}/artists?ids=${ids}`);
        if (retryResponse.ok) {
          const data = await retryResponse.json();
          allArtists.push(...this._mapArtists(data.artists));
        }
        continue;
      }

      if (!response.ok) return null;

      const data = await response.json();
      allArtists.push(...this._mapArtists(data.artists));
    }

    return allArtists;
  }

  /** @private */
  async _getArtistsSequential(artistIds) {
    const results = [];
    for (let i = 0; i < artistIds.length; i++) {
      try {
        const artist = await this.getArtist(artistIds[i]);
        if (artist) results.push(artist);
      } catch (e) {
        // Skip failed artist
      }
      if (i < artistIds.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    return results;
  }

  /** @private */
  _mapArtists(artists) {
    return (artists || [])
      .filter(a => a !== null)
      .map(a => ({ id: a.id, name: a.name, imageUrl: selectLargestImage(a.images) }));
  }

  /**
   * Sucht einen Track für einen Künstler und gibt die Track-URI zurück.
   * @param {string} artistName
   * @returns {Promise<{trackUri: string, trackName: string}|null>}
   */
  async findTrackUri(artistName) {
    const query = encodeURIComponent(`artist:${artistName}`);
    const response = await this._fetchWithTimeout(
      `${BASE_URL}/search?q=${query}&type=track&limit=1`
    );

    if (!response.ok) return null;

    const data = await response.json();
    const items = data.tracks && data.tracks.items;
    if (!items || items.length === 0) return null;

    return {
      trackUri: items[0].uri,
      trackName: items[0].name,
    };
  }

  /**
   * Ruft bis zu maxSize Tracks für einen Künstler ab (via Search API).
   * @param {string} artistId
   * @param {number} maxSize
   * @param {string} [artistName] - wird bei Bedarf nachgeladen
   * @returns {Promise<Array<{uri: string, name: string}>>}
   */
  async getArtistTopTracks(artistId, maxSize = 5, artistName = null) {
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

    const query = encodeURIComponent(`artist:${name}`);
    let response;
    try {
      response = await this._fetchWithTimeout(
        `${BASE_URL}/search?q=${query}&type=track&limit=${maxSize * 2}`
      );
    } catch (error) {
      console.error('Fehler beim Laden der Tracks:', error.message);
      return [];
    }

    if (!response.ok) {
      console.error(`Spotify API Fehler beim Laden der Tracks: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const items = (data.tracks && data.tracks.items) || [];

    const validTracks = [];
    const seenUris = new Set();

    for (const track of items) {
      if (validTracks.length >= maxSize) break;
      if (isValidTrack(track) && !seenUris.has(track.uri)) {
        seenUris.add(track.uri);
        validTracks.push({ uri: track.uri, name: track.name });
      }
    }

    return validTracks;
  }
}
