# Implementation Plan: Session Persistence

## Overview

Implement a `TokenManager` module that handles OAuth token storage (localStorage with `spotigrid_` prefix), automatic session restoration, transparent 401-based token refresh with request queuing, and a logout mechanism. Integrate it into the existing App, SpotifyAPI, and SpotifyPlayer modules so that sessions survive page refreshes.

## Tasks

- [x] 1. Create TokenManager module with core storage logic
  - [x] 1.1 Create `js/token-manager.js` with TokenManager class skeleton
    - Export `TokenManager` class with constructor accepting `{ clientId, storage? }`
    - Implement `_storage` detection: try localStorage, fallback to in-memory Map if `setItem` throws
    - Define internal state fields: `_accessToken`, `_refreshToken`, `_expiresAt`, `_refreshPromise`, `_clientId`
    - Implement `getAccessToken()` and `getRefreshToken()` getters
    - Implement `isTokenValid()` — returns true if `_accessToken` is non-null and `Date.now() < _expiresAt`
    - _Requirements: 1.1, 1.2, 1.3, 6.1, 6.2_

  - [x] 1.2 Implement `save(tokenData)` method
    - Accept `{ access_token, refresh_token?, expires_in? }` parameter
    - Calculate `expiresAt = Date.now() + expires_in * 1000` (only if `expires_in` present)
    - Write to storage under `spotigrid_access_token`, `spotigrid_refresh_token`, `spotigrid_token_expires_at`
    - Only write fields that are present (skip missing refresh_token or expires_in)
    - If `setItem` throws (QuotaExceededError), catch and keep tokens in memory only
    - Update internal `_accessToken`, `_refreshToken`, `_expiresAt` fields
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 1.3 Implement `clear()` method
    - Remove `spotigrid_access_token`, `spotigrid_refresh_token`, `spotigrid_token_expires_at` from storage
    - Set `_accessToken`, `_refreshToken`, `_expiresAt` to null
    - _Requirements: 5.2, 4.1_

  - [x] 1.4 Implement `restore()` method
    - Read `spotigrid_access_token`, `spotigrid_refresh_token`, `spotigrid_token_expires_at` from storage
    - If access_token exists and expiresAt is in the future: set internal fields, return SessionData (no network call)
    - If access_token exists but expired and refresh_token exists: call `this.refresh()`
    - If refresh fails or no data found: call `this.clear()`, return null
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 1.5 Implement `refresh()` method
    - POST to `https://accounts.spotify.com/api/token` with `grant_type=refresh_token`, `refresh_token`, `client_id`
    - Use AbortController with 10s timeout
    - On success: call `save()` with new token data, return SessionData
    - On failure (400, 401, network error, timeout): call `clear()`, throw error
    - If `_refreshPromise` already exists, return that promise (single-flight pattern)
    - _Requirements: 3.1, 3.2, 3.4, 3.5_

  - [x] 1.6 Implement `authenticatedFetch(url, options)` method
    - Inject `Authorization: Bearer {accessToken}` header into request
    - If response is 401 and refresh_token exists: call `refresh()`, then retry original request once with new token
    - If refresh is already in progress (`_refreshPromise` set): wait for it, then retry with new token
    - If 401 and no refresh_token, or refresh fails: call `clear()`, throw error
    - Return the final Response object
    - _Requirements: 3.1, 3.3, 3.5, 4.3, 4.4_

  - [x] 1.7 Write property test: Token save/restore round-trip
    - **Property 1: Token save/restore round-trip**
    - **Validates: Requirements 1.1, 2.5, 3.2**

  - [x] 1.8 Write property test: Storage location invariant
    - **Property 2: Storage location invariant**
    - **Validates: Requirements 1.2, 6.1**

  - [x] 1.9 Write property test: Partial token storage
    - **Property 3: Partial token storage**
    - **Validates: Requirements 1.4**

  - [x] 1.10 Write property test: Memory fallback preserves access
    - **Property 4: Memory fallback preserves access**
    - **Validates: Requirements 1.3, 6.2**

  - [x] 1.11 Write property test: Restore valid token without network request
    - **Property 5: Restore valid token without network request**
    - **Validates: Requirements 2.1**

  - [x] 1.12 Write property test: Failed refresh clears all session data
    - **Property 6: Failed refresh clears all session data**
    - **Validates: Requirements 2.3, 3.4, 4.1, 4.4**

  - [x] 1.13 Write property test: Authenticated fetch retries exactly once on 401
    - **Property 7: Authenticated fetch retries exactly once on 401**
    - **Validates: Requirements 3.1, 3.3, 4.3**

  - [x] 1.14 Write property test: Request queuing during refresh
    - **Property 8: Request queuing during refresh**
    - **Validates: Requirements 3.5**

  - [x] 1.15 Write property test: Clear removes all session data
    - **Property 9: Clear removes all session data**
    - **Validates: Requirements 5.2**

  - [x] 1.16 Write property test: Refresh token never exposed in URL or DOM
    - **Property 10: Refresh token never exposed in URL or DOM**
    - **Validates: Requirements 6.4**

- [x] 2. Checkpoint - Ensure TokenManager tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Integrate TokenManager into App class
  - [x] 3.1 Modify `js/app.js` to import and instantiate TokenManager
    - Import `TokenManager` from `./token-manager.js`
    - Add `this.tokenManager = new TokenManager({ clientId: CLIENT_ID })` in constructor
    - Remove `this._token` field (replaced by TokenManager)
    - _Requirements: 1.1, 2.1_

  - [x] 3.2 Modify `App.init()` to restore session before URL code check
    - Call `this.tokenManager.restore()` as first step in `init()`
    - If restore returns SessionData: call `_onAuthenticated()` directly (skip login button)
    - If restore returns null: proceed with existing code/URL check logic
    - After successful `exchangeCodeForToken()`: call `this.tokenManager.save(tokenData)` instead of `this._token = tokenData.access_token`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.3 Implement `logout()` method in App class
    - Stop active playback: if `this.player?.isPlaying()`, call `this.player.stop()` and `this.player.disconnect()`
    - Call `this.tokenManager.clear()`
    - Show login-button, hide logout-button, hide user-info
    - Clear grid-container and now-playing display
    - _Requirements: 5.2, 5.3, 5.4, 5.5_

  - [x] 3.4 Update `_onAuthenticated()` to use TokenManager and show logout button
    - Get token from `this.tokenManager.getAccessToken()` instead of `this._token`
    - Show logout-button, hide login-button
    - Register logout-button click handler calling `this.logout()`
    - _Requirements: 5.1_

  - [x] 3.5 Write unit tests for App session integration
    - Test: restore with empty localStorage shows login button (Req 2.4)
    - Test: logout resets UI elements correctly (Req 5.3)
    - Test: logout stops active playback (Req 5.4)
    - Test: logout-button visible when authenticated (Req 5.1)
    - Test: error message on failed refresh (Req 4.2)
    - _Requirements: 2.4, 4.2, 5.1, 5.3, 5.4_

- [x] 4. Modify SpotifyAPI to use authenticatedFetch
  - [x] 4.1 Refactor `js/spotify-api.js` constructor and fetch calls
    - Change constructor to accept `tokenManager` (or a `fetchFn` function) instead of `token` string
    - Replace all direct `fetch()` calls with `this._fetchFn()` or `tokenManager.authenticatedFetch()`
    - Remove manual `Authorization` header injection (TokenManager handles it)
    - Remove 401-specific error handling from individual methods (TokenManager handles retry)
    - Keep timeout logic (AbortController) per request
    - _Requirements: 3.1, 3.3_

  - [x] 4.2 Update existing SpotifyAPI tests to work with new constructor
    - Update test mocks to provide a tokenManager or fetchFn
    - Verify existing test scenarios still pass
    - _Requirements: 3.1, 3.3_

- [x] 5. Modify SpotifyPlayer to use dynamic token from TokenManager
  - [x] 5.1 Refactor `js/spotify-player.js` to accept TokenManager
    - Change constructor to accept `tokenManager` instead of `token`
    - Update `getOAuthToken` callback in Player init to call `tokenManager.getAccessToken()`
    - Update `play()` method to use `tokenManager.authenticatedFetch()` for the PUT request
    - _Requirements: 3.3_

  - [x] 5.2 Write unit tests for SpotifyPlayer token integration
    - Test: getOAuthToken callback returns current token from TokenManager
    - Test: play() uses authenticatedFetch for the play endpoint
    - _Requirements: 3.3_

- [x] 6. Checkpoint - Ensure all module integration tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Add logout button to HTML and wire UI
  - [x] 7.1 Add logout button to `index.html`
    - Add `<button id="logout-button" type="button" hidden>Logout</button>` in the header `auth-section` div
    - _Requirements: 5.1_

  - [x] 7.2 Write integration tests for full session flow
    - Test: Auth → Save → Restore → API calls → Logout (full cycle)
    - Test: TokenManager + SpotifyAPI cooperation on 401 handling
    - Test: Memory-only mode: reload shows login button (Req 6.3)
    - Test: Logout completes within 1 second (Req 5.5)
    - _Requirements: 5.5, 6.3_

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses vitest + fast-check with jsdom environment — no build step required
- Run tests with `npm test` (vitest --run)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["1.4", "1.5"] },
    { "id": 3, "tasks": ["1.6"] },
    { "id": 4, "tasks": ["1.7", "1.8", "1.9", "1.10", "1.11", "1.12", "1.13", "1.14", "1.15", "1.16"] },
    { "id": 5, "tasks": ["3.1", "4.1", "5.1", "7.1"] },
    { "id": 6, "tasks": ["3.2", "3.3", "3.4", "4.2", "5.2"] },
    { "id": 7, "tasks": ["3.5", "7.2"] }
  ]
}
```
