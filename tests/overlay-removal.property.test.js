import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { GridRenderer } from '../js/grid-renderer.js';

/**
 * Feature: grid-ui-enhancements, Property 4: hideOverlay removes the overlay completely
 *
 * Validates: Requirements 2.2
 *
 * For any artist with an active overlay, calling hideOverlay SHALL remove the
 * .overlay element from that grid-item, leaving no overlay remnants in the DOM
 * for that artist.
 */
describe('Feature: grid-ui-enhancements, Property 4: hideOverlay removes the overlay completely', () => {
  let container;
  let renderer;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'grid-container';
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  // Generator: random artist object
  const artistArb = fc.record({
    id: fc.stringMatching(/^[a-z][a-z0-9-]{1,20}$/).filter(s => s.length >= 2),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    imageUrl: fc.oneof(
      fc.constant(null),
      fc.webUrl()
    ),
  });

  // Generator: array of artists with unique IDs (1-10)
  const artistsArb = fc.uniqueArray(artistArb, {
    minLength: 1,
    maxLength: 10,
    selector: (a) => a.id,
  });

  it('after hideOverlay(id), no .overlay element exists within that artist grid-item', () => {
    fc.assert(
      fc.property(artistsArb, (artists) => {
        // Render the grid fresh
        renderer = new GridRenderer(container);
        renderer.render(artists);

        // For each artist: show overlay then hide, verify removal
        for (const artist of artists) {
          renderer.showOverlay(artist.id);

          // Confirm overlay exists before hide
          const gridItem = container.querySelector(`[data-artist-id="${artist.id}"]`);
          expect(gridItem).not.toBeNull();
          const overlayBefore = gridItem.querySelector('.overlay');
          expect(overlayBefore).not.toBeNull();

          // Hide overlay
          renderer.hideOverlay(artist.id);

          // Verify no .overlay remains for this artist
          const overlayAfter = gridItem.querySelector('.overlay');
          expect(overlayAfter).toBeNull();
        }
      }),
      { numRuns: 100 }
    );
  });

  it('after interleaved show/hide sequences, hidden artists have no overlay remnants', () => {
    // Generator for action sequences on a set of artists
    // Models realistic app behavior: show only when not already showing
    const actionArb = (artistIds) =>
      fc.array(
        fc.constantFrom(...artistIds),
        { minLength: 1, maxLength: 40 }
      );

    fc.assert(
      fc.property(
        artistsArb.chain((artists) =>
          actionArb(artists.map((a) => a.id)).map((clickedIds) => ({ artists, clickedIds }))
        ),
        ({ artists, clickedIds }) => {
          // Render the grid fresh
          renderer = new GridRenderer(container);
          renderer.render(artists);

          // Track which artists currently have an overlay shown (mirrors app logic)
          const overlayState = new Map();
          for (const artist of artists) {
            overlayState.set(artist.id, false);
          }

          // Execute random interleaved click actions (simulating app toggle behavior)
          for (const artistId of clickedIds) {
            if (overlayState.get(artistId)) {
              // Artist is currently playing → stop (hide overlay)
              renderer.hideOverlay(artistId);
              overlayState.set(artistId, false);

              // KEY PROPERTY: after hideOverlay, zero .overlay elements remain
              const gridItem = container.querySelector(`[data-artist-id="${artistId}"]`);
              expect(gridItem).not.toBeNull();
              const overlays = gridItem.querySelectorAll('.overlay');
              expect(overlays.length).toBe(0);
            } else {
              // Artist is not playing → start (show overlay)
              renderer.showOverlay(artistId);
              overlayState.set(artistId, true);
            }
          }

          // Final check: all artists marked as hidden should have zero overlays
          for (const [artistId, hasOverlay] of overlayState.entries()) {
            if (!hasOverlay) {
              const gridItem = container.querySelector(`[data-artist-id="${artistId}"]`);
              const overlays = gridItem.querySelectorAll('.overlay');
              expect(overlays.length).toBe(0);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
