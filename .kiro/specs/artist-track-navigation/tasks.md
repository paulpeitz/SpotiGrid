# Implementation Plan: artist-track-navigation

## Overview

This implementation plan covers the artist-track-navigation feature for SpotiGrid. The feature adds five tracks per artist with forward/back navigation controls, enlarges the player-status area, and fixes it to remain visible while scrolling.

## Tasks

- [ ] 1. Set up project structure and core data structures
  - [x] 1.1 Create TrackCollection class in js/track-collection.js
    - Implement constructor with tracks array and maxSize (default 5)
    - Implement getTracks(), getCount(), isNavigable(), getTrackAt(index)
    - Filter invalid tracks (empty name, invalid URI) in constructor
    - Limit to maxSize tracks, preserve order
    - _Requirements: 1.2, 1.3, 1.4_

  - [x] 1.2 Create TrackNavigation class in js/track-navigation.js
    - Implement constructor accepting TrackCollection
    - Implement getCurrentIndex(), getCurrentTrack()
    - Implement forward() with circular navigation (last→first)
    - Implement back() with circular navigation (first→last)
    - Implement canNavigate() check
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 1.3 Write property tests for TrackCollection
    - **Property 1: Track-Collection-Grenze**
    - **Validates: Requirements 1.2, 1.3, 1.4**
    - Test: collection contains at most 5 tracks
    - Test: if 5+ valid candidates, exactly 5 tracks
    - Test: order preserved

  - [ ]* 1.4 Write property tests for TrackNavigation
    - **Property 2: Navigation as Circular Permutation**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
    - Test: forward(back(index)) = index
    - Test: back(forward(index)) = index
    - Test: repeating forward N times returns to start (N = collection length)

- [x] 2. Extend SpotifyAPI with getArtistTopTracks
  - [x] 2.1 Add getArtistTopTracks method to SpotifyAPI class
    - Fetch top tracks from Spotify API for artist ID
    - Filter to valid tracks (non-empty name, valid URI)
    - Limit to maxSize (default 5)
    - Return Promise<ValidTrack[]>
    - _Requirements: 1.1_

  - [x] 2.2 Handle API errors gracefully
    - Return empty array on API failure
    - Log error for debugging
    - _Requirements: 6.1_

  - [ ]* 2.3 Write unit tests for getArtistTopTracks
    - Test filtering of invalid tracks
    - Test limiting to 5 tracks
    - Test order preservation
    - Test error handling
    - _Requirements: 1.2, 1.3, 1.4, 6.1_

- [x] 3. Implement UI components - HTML and CSS
  - [x] 3.1 Update index.html - add navigation controls to player-status
    - Add navigation-controls div with back-control and forward-control buttons
    - Use SVG icons for navigation buttons
    - Add aria-labels for accessibility (German: "Zum vorherigen Track", "Zum nächsten Track")
    - _Requirements: 4.1, 4.4, 4.5_

  - [x] 3.2 Update style.css - add fixed positioning and scaling
    - Add .player-status fixed positioning (top: 0, left: 0, right: 0, z-index: 1000)
    - Apply Status_Skalierung 1.2x for padding and font-size
    - Style navigation-controls container (inline-flex, gap: 8px, margin-left: 16px)
    - Style buttons (background: #282828, border-radius: 50%, dimensions 1.2x)
    - Add hover states
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 3.3 Add responsive CSS for narrow viewports
    - Add media query for max-width: 599px
    - Reduce padding to 10px, font-size to 0.9rem
    - Ensure buttons remain 40x40px and usable
    - _Requirements: 5.4_

  - [ ]* 3.4 Write unit tests for UI rendering
    - Test player-status structure has exactly one forward and one back control
    - Test button accessibility labels
    - _Requirements: 4.1, 4.2, 4.4, 4.5_

- [ ] 4. Integrate with App class - track collection management
  - [x] 4.1 Update App class in js/app.js
    - Add trackCollection property to track current collection
    - Add trackNavigation property for navigation logic
    - Add trackIndex property to PlayerState
    - _Requirements: 2.1_

  - [x] 4.2 Implement handleArtistClick with track collection
    - On artist click, call getArtistTopTracks
    - If no valid tracks, mark artist unplayable
    - If valid tracks, create TrackCollection and TrackNavigation
    - Start playback of first track
    - Show player-status with navigation controls
    - _Requirements: 1.5, 2.1, 2.2, 2.3_

  - [x] 4.3 Implement forward navigation handler
    - Call trackNavigation.forward()
    - Stop current track, play new track
    - Update now-playing display
    - Handle edge case (0 or 1 track - disable buttons)
    - _Requirements: 3.1, 3.5, 3.6_

  - [x] 4.4 Implement back navigation handler
    - Call trackNavigation.back()
    - Stop current track, play new track
    - Update now-playing display
    - Handle edge case (0 or 1 track - disable buttons)
    - _Requirements: 3.2, 3.5, 3.6_

  - [x] 4.5 Implement button enable/disable logic
    - Disable both buttons if 0 or 1 track in collection
    - Enable both buttons if 2+ tracks
    - _Requirements: 3.7, 3.8, 4.6_

  - [x] 4.6 Handle playback stop and end
    - Hide player-status on stop
    - Clear now-playing content
    - Clean up track collection
    - _Requirements: 2.6, 4.7_

  - [ ]* 4.7 Write property tests for navigation and display
    - **Property 3: Display Follows Selection**
    - **Validates: Requirements 2.4, 3.6**
    - Test: now-playing shows correct artist and track
    - Test: displayed title never wrong index

    - **Property 4: Single Active Playback**
    - **Validates: Requirements 2.3, 3.5**
    - Test: previous track stops before new starts
    - Test: at most one active track after transition

    - **Property 5: Status Consistency**
    - **Validates: Requirements 2.4, 2.5, 2.6, 4.1, 4.7**
    - Test: active playback = visible player-status with controls
    - Test: inactive = hidden player-status, empty now-playing

    - **Property 6: Limited Track Lists**
    - **Validates: Requirements 3.7, 3.8, 4.6**
    - Test: 0-1 track = both buttons disabled
    - Test: 2+ tracks = both buttons enabled

    - **Property 7: Reset Idempotency**
    - **Validates: Requirements 2.6, 6.4**
    - Test: stop once or twice = same state
    - Test: logout once or twice = same state

- [ ] 5. Handle error states and logout
  - [x] 5.1 Handle Spotify API errors
    - End Active_Playback if running
    - Show error message in error container
    - Mark artist as unplayable
    - _Requirements: 6.1, 6.2_

  - [x] 5.2 Handle player errors
    - Treat playback as inactive
    - Hide player-status
    - Show error message
    - _Requirements: 6.3_

  - [x] 5.3 Handle logout cleanup
    - Stop any playing track
    - Hide player-status
    - Clear now-playing
    - Handle cleanup failure gracefully
    - _Requirements: 6.4, 6.5_

  - [x] 5.4 Handle auth refresh during navigation
    - Detect auth invalidation
    - Trigger re-authentication flow
    - _Requirements: 6.7_

- [ ] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Ensure existing features remain unchanged
  - [x] 7.1 Test existing artist selection still works
    - Grid display unchanged
    - Overlay synchronization unchanged
    - Authentication unchanged
    - _Requirements: 6.6_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "3.1", "3.2"] },
    { "id": 2, "tasks": ["2.2", "3.3"] },
    { "id": 3, "tasks": ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6"] },
    { "id": 4, "tasks": ["5.1", "5.2", "5.3", "5.4"] },
    { "id": 5, "tasks": ["7.1"] }
  ]
}
```