/**
 * PKCE (Proof Key for Code Exchange) helpers for Spotify OAuth.
 */

/**
 * Generates a random Code Verifier (43-128 characters, URL-safe base64).
 * @returns {string}
 */
export function generateCodeVerifier() {
  const array = new Uint8Array(64);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Computes the Code Challenge from a Code Verifier (S256).
 * @param {string} verifier
 * @returns {Promise<string>}
 */
export async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Exchanges an authorization code for an access token.
 * @param {string} code - The authorization code from Spotify redirect
 * @param {string} codeVerifier - The stored code verifier
 * @param {string} clientId - Spotify Client ID
 * @param {string} redirectUri - The redirect URI used in the auth request
 * @returns {Promise<Object>} Token data from Spotify
 */
export async function exchangeCodeForToken(code, codeVerifier, clientId, redirectUri) {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error_description || 'Token-Austausch fehlgeschlagen.');
  }

  return response.json();
}
