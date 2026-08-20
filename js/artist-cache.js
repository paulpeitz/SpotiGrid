/**
 * LocalStorage cache for artist data to avoid Spotify API rate-limiting.
 * Cache is valid for 24 hours and invalidated when artist IDs change.
 */

const CACHE_KEY = 'spotigrid_artists_cache';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Loads cached artist data from localStorage.
 * @param {string[]} artistIds - Expected artist IDs (for cache validation)
 * @returns {Array|null} Cached artist array, or null if cache is invalid
 */
export function loadArtistsFromCache(artistIds) {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const { data, ids, timestamp } = JSON.parse(cached);

    if (Date.now() - timestamp > CACHE_TTL) return null;
    if (!ids || ids.join(',') !== artistIds.join(',')) return null;
    if (!Array.isArray(data) || data.length === 0) return null;

    return data;
  } catch (e) {
    return null;
  }
}

/**
 * Saves artist data to localStorage cache.
 * @param {string[]} artistIds
 * @param {Array} artists
 */
export function saveArtistsToCache(artistIds, artists) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data: artists,
      ids: artistIds,
      timestamp: Date.now(),
    }));
  } catch (e) {
    // Storage full or unavailable — no problem, will just re-fetch next time
  }
}
