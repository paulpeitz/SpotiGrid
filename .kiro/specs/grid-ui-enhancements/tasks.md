# Implementation Plan: Grid UI Enhancements

## Overview

This plan restructures the grid-item DOM to include a permanent artist-name label below the image, wraps the image in a dedicated container for overlay positioning, and replaces the current overlay artist-name text with animated CSS equalizer bars. Changes are scoped to `grid-renderer.js` and `style.css`, with property-based and unit tests validating correctness.

## Tasks

- [x] 1. Restructure grid-item DOM and add permanent artist label
  - [x] 1.1 Modify `GridRenderer.render()` to create new DOM structure
    - Wrap image/placeholder in a `div.grid-item-image` container
    - Append a `span.artist-label` with `textContent = artist.name` after the image wrapper
    - Change `.grid-item` layout to `flex-direction: column` so image and label stack vertically
    - Ensure `data-artist-id` remains on the outer `.grid-item`
    - For placeholder artists, move the placeholder content inside `.grid-item-image`
    - _Requirements: 1.1, 1.2, 1.4, 4.4_

  - [x] 1.2 Update `showOverlay()` to inject overlay inside `.grid-item-image` wrapper
    - Remove the `artistName` parameter from the method signature
    - Instead of creating a `span.artist-name`, create a `div.equalizer` with `EQUALIZER_BAR_COUNT` (4) child `div.bar` elements
    - Append the overlay inside the `.grid-item-image` wrapper (not the outer grid-item)
    - _Requirements: 2.1, 2.3, 2.4, 3.5_

  - [x] 1.3 Update `hideOverlay()` to find overlay inside `.grid-item-image`
    - Locate the overlay within the `.grid-item-image` wrapper and remove it
    - _Requirements: 2.2_

  - [x] 1.4 Export `EQUALIZER_BAR_COUNT` constant from `grid-renderer.js`
    - Define `const EQUALIZER_BAR_COUNT = 4` at module level
    - Export it for use in tests
    - _Requirements: 3.5_

  - [x] 1.5 Write property test: Render produces correct label and structure (Property 1)
    - **Property 1: Render produces correct label and structure for any artist**
    - Generate random artist objects (with/without imageUrl) via fast-check
    - Verify each grid-item has `.grid-item-image` wrapper and `.artist-label` with correct textContent
    - Test file: `tests/grid-label-structure.property.test.js`
    - **Validates: Requirements 1.1, 1.2, 1.4, 4.4**

  - [x] 1.6 Write property test: Artist labels persist through overlay state changes (Property 2)
    - **Property 2: Artist labels persist through all overlay state changes**
    - Generate random sequences of showOverlay/hideOverlay calls via fast-check
    - Verify all `.artist-label` elements remain in DOM with unchanged textContent after each operation
    - Test file: `tests/grid-label-persistence.property.test.js`
    - **Validates: Requirements 1.3, 1.5**

- [x] 2. Checkpoint - Verify grid structure
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Implement equalizer overlay and CSS animations
  - [x] 3.1 Add CSS styles for new grid-item structure
    - Change `.grid-item` to `display: flex; flex-direction: column`
    - Add `.grid-item-image` styles: `position: relative; aspect-ratio: 1; overflow: hidden; width: 100%`
    - Move existing `.grid-item` aspect-ratio and overflow to `.grid-item-image`
    - Style `.artist-label`: font-size, color, truncation with `text-overflow: ellipsis`, `white-space: nowrap`, `overflow: hidden`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 3.2 Add CSS styles for equalizer bars and animation
    - Style `.equalizer` container: flex, centered, gap between bars
    - Style `.bar` elements: width, background color `#1db954`, border-radius
    - Add `@keyframes equalize` for vertical scaling animation
    - Apply staggered `animation-delay` per bar using `:nth-child` selectors
    - Add CSS custom properties: `--equalizer-color`, `--equalizer-bar-width`, `--equalizer-bar-gap`, `--equalizer-max-height`, `--equalizer-duration`
    - Include fallback color directly on `.bar` rule
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.3 Remove or adjust overlay `.artist-name` CSS rules
    - Remove the `.grid-item .overlay .artist-name` rule (no longer used)
    - Keep the `.overlay` base styles (semi-transparent background, positioning)
    - Update `.overlay` positioning to be scoped within `.grid-item-image`
    - _Requirements: 2.3, 3.1_

  - [x] 3.4 Write property test: Overlay contains equalizer bars without artist name (Property 3)
    - **Property 3: Overlay contains equalizer bars without artist name text**
    - Generate random artists, call showOverlay, verify overlay has `.equalizer` with 3–5 `.bar` children and no `.artist-name` element
    - Test file: `tests/equalizer-overlay-structure.property.test.js`
    - **Validates: Requirements 2.1, 2.3, 2.4, 3.5**

  - [x] 3.5 Write property test: hideOverlay removes overlay completely (Property 4)
    - **Property 4: hideOverlay removes the overlay completely**
    - Generate random show/hide sequences, verify no `.overlay` remains after hide
    - Test file: `tests/overlay-removal.property.test.js`
    - **Validates: Requirements 2.2**

- [x] 4. Checkpoint - Verify equalizer overlay
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Update callers and write unit tests
  - [x] 5.1 Update `showOverlay` call sites in `app.js`
    - Remove the `artistName` argument from all `showOverlay(artistId, artistName)` calls
    - Verify the app still functions correctly with the updated signature
    - _Requirements: 2.1_

  - [x] 5.2 Write unit tests for equalizer bar details
    - Test that exactly `EQUALIZER_BAR_COUNT` (4) bars are created
    - Test that each bar has a different `animation-delay` style for stagger effect
    - Test that `.artist-label` has truncation-related CSS class
    - Test placeholder artist renders `.artist-label` with correct name
    - Test `showOverlay` works without second parameter
    - Test file: `tests/grid-renderer.test.js` (extend existing)
    - _Requirements: 2.4, 3.2, 3.5, 4.3_

- [x] 6. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- CSS animation behavior cannot be verified in JSDOM; visual verification is needed separately
- The `showOverlay` signature change (dropping `artistName`) requires updating call sites in `app.js`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4"] },
    { "id": 2, "tasks": ["1.5", "1.6", "3.1"] },
    { "id": 3, "tasks": ["3.2", "3.3"] },
    { "id": 4, "tasks": ["3.4", "3.5", "5.1"] },
    { "id": 5, "tasks": ["5.2"] }
  ]
}
```
