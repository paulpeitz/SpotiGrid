/**
 * Manages navigation within a TrackCollection.
 * Supports circular forward/back navigation.
 */
class TrackNavigation {
  /**
   * @param {TrackCollection} collection - The track collection to navigate
   */
  constructor(collection) {
    this._collection = collection;
    this._currentIndex = 0;
  }

  /**
   * @returns {number} - Current track index
   */
  getCurrentIndex() {
    return this._currentIndex;
  }

  /**
   * @returns {ValidTrack|null} - Current track or null if collection is empty
   */
  getCurrentTrack() {
    if (!this._collection || this._collection.getCount() === 0) {
      return null;
    }
    return this._collection.getTrackAt(this._currentIndex);
  }

  /**
   * Navigate to next track (circular - wraps from last to first).
   * @returns {ValidTrack|null} - The new current track
   */
  forward() {
    const count = this._collection.getCount();
    if (count === 0) {
      return null;
    }
    
    // Circular navigation: if at last, wrap to first; otherwise increment
    this._currentIndex = (this._currentIndex + 1) % count;
    
    return this.getCurrentTrack();
  }

  /**
   * Navigate to previous track (circular - wraps from first to last).
   * @returns {ValidTrack|null} - The new current track
   */
  back() {
    const count = this._collection.getCount();
    if (count === 0) {
      return null;
    }
    
    // Circular navigation: if at first, wrap to last; otherwise decrement
    this._currentIndex = (this._currentIndex - 1 + count) % count;
    
    return this.getCurrentTrack();
  }

  /**
   * @returns {boolean} - Whether navigation is possible (collection has 2+ tracks)
   */
  canNavigate() {
    return this._collection.isNavigable();
  }
}

export { TrackNavigation };