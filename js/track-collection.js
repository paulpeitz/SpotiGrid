/**
 * @typedef {Object} ValidTrack
 * @property {string} uri - Spotify track URI
 * @property {string} name - Track title
 */

/**
 * Manages a collection of valid tracks for an artist.
 * Maximum 5 tracks, ordered as received from Spotify.
 */
class TrackCollection {
  /**
   * @param {ValidTrack[]} tracks - Array of valid tracks
   * @param {number} maxSize - Maximum collection size (default: 5)
   */
  constructor(tracks = [], maxSize = 5) {
    this._tracks = [];
    this._maxSize = maxSize;

    // Filter invalid tracks and limit to maxSize
    if (Array.isArray(tracks)) {
      const validTracks = tracks.filter(track => this._isValidTrack(track));
      this._tracks = validTracks.slice(0, this._maxSize);
    }
  }

  /**
   * Check if a track is valid (non-empty name, valid URI)
   * @param {*} track
   * @returns {boolean}
   */
  _isValidTrack(track) {
    if (!track || typeof track !== 'object') return false;
    const name = track.name;
    const uri = track.uri;
    // Empty name is invalid
    if (!name || typeof name !== 'string' || name.trim() === '') return false;
    // Invalid URI is invalid (must be a non-empty string starting with spotify:track:)
    if (!uri || typeof uri !== 'string' || !uri.startsWith('spotify:track:')) return false;
    return true;
  }

  /**
   * @returns {ValidTrack[]} - All tracks in collection
   */
  getTracks() {
    return [...this._tracks];
  }

  /**
   * @returns {number} - Number of tracks
   */
  getCount() {
    return this._tracks.length;
  }

  /**
   * @returns {boolean} - Whether collection has valid navigation (2+ tracks)
   */
  isNavigable() {
    return this._tracks.length >= 2;
  }

  /**
   * @param {number} index
   * @returns {ValidTrack|null} - Track at index, or null if out of bounds
   */
  getTrackAt(index) {
    if (index < 0 || index >= this._tracks.length) {
      return null;
    }
    return this._tracks[index];
  }
}

export { TrackCollection };