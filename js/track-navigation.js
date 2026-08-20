/**
 * Handles circular navigation within a TrackCollection.
 */
export class TrackNavigation {
  /**
   * @param {import('./track-collection.js').TrackCollection} collection
   */
  constructor(collection) {
    this._collection = collection;
    this._currentIndex = 0;
  }

  /** @returns {number} Current track index */
  getCurrentIndex() {
    return this._currentIndex;
  }

  /** @returns {import('./track-utils.js').ValidTrack|null} Current track or null */
  getCurrentTrack() {
    if (!this._collection || this._collection.getCount() === 0) {
      return null;
    }
    return this._collection.getTrackAt(this._currentIndex);
  }

  /**
   * Navigate to next track (circular: last → first).
   * @returns {import('./track-utils.js').ValidTrack|null}
   */
  forward() {
    const count = this._collection.getCount();
    if (count === 0) return null;
    this._currentIndex = (this._currentIndex + 1) % count;
    return this.getCurrentTrack();
  }

  /**
   * Navigate to previous track (circular: first → last).
   * @returns {import('./track-utils.js').ValidTrack|null}
   */
  back() {
    const count = this._collection.getCount();
    if (count === 0) return null;
    this._currentIndex = (this._currentIndex - 1 + count) % count;
    return this.getCurrentTrack();
  }

  /** @returns {boolean} Whether navigation is possible (2+ tracks) */
  canNavigate() {
    return this._collection.isNavigable();
  }
}
