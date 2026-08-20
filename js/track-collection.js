import { isValidTrack } from './track-utils.js';

/**
 * Manages a collection of valid tracks for an artist.
 * Maximum 5 tracks, ordered as received from Spotify.
 */
export class TrackCollection {
  /**
   * @param {import('./track-utils.js').ValidTrack[]} tracks - Array of tracks to filter and store
   * @param {number} maxSize - Maximum collection size (default: 5)
   */
  constructor(tracks = [], maxSize = 5) {
    this._tracks = [];
    this._maxSize = maxSize;

    if (Array.isArray(tracks)) {
      const validTracks = tracks.filter(track => isValidTrack(track));
      this._tracks = validTracks.slice(0, this._maxSize);
    }
  }

  /** @returns {import('./track-utils.js').ValidTrack[]} Copy of all tracks */
  getTracks() {
    return [...this._tracks];
  }

  /** @returns {number} Number of tracks in collection */
  getCount() {
    return this._tracks.length;
  }

  /** @returns {boolean} Whether collection has 2+ tracks for navigation */
  isNavigable() {
    return this._tracks.length >= 2;
  }

  /**
   * @param {number} index
   * @returns {import('./track-utils.js').ValidTrack|null} Track at index, or null if out of bounds
   */
  getTrackAt(index) {
    if (index < 0 || index >= this._tracks.length) {
      return null;
    }
    return this._tracks[index];
  }
}
