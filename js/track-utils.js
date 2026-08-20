/**
 * Shared track validation utility.
 * Used by both SpotifyAPI and TrackCollection.
 */

/**
 * @typedef {Object} ValidTrack
 * @property {string} uri - Spotify track URI (starts with "spotify:track:")
 * @property {string} name - Non-empty track title
 */

/**
 * Checks if a track object is valid:
 * - Must be a non-null object
 * - name must be a non-empty, non-whitespace string
 * - uri must start with "spotify:track:"
 *
 * @param {*} track - The track to validate
 * @returns {boolean}
 */
export function isValidTrack(track) {
  if (!track || typeof track !== 'object') return false;
  const name = track.name;
  const uri = track.uri;
  if (!name || typeof name !== 'string' || name.trim() === '') return false;
  if (!uri || typeof uri !== 'string' || !uri.startsWith('spotify:track:')) return false;
  return true;
}
