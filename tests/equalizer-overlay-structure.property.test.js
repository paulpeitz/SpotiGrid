import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { GridRenderer, EQUALIZER_BAR_COUNT } from '../js/grid-renderer.js';

/**
 * Feature: grid-ui-enhancements, Property 3: Overlay contains equalizer bars without artist name text
 *
 * Validates: Requirements 2.1, 2.3, 2.4, 3.5
 *
 * For any artist in a rendered grid, calling showOverlay SHALL produce an overlay element
 * containing a `.equalizer` container with between 3 and 5 `.bar` child elements,
 * and the overlay SHALL NOT contain an `.artist-name` element or any text node
 * displaying the artist name.
 */
describe('Feature: grid-ui-enhancements, Property 3: Overlay contains equalizer bars without artist name text', () => {
  let container;
  let renderer;

  // Generator: random artist object
  const artistArb = fc.record({
    id: fc.stringMatching(/^[a-zA-Z0-9_-]{1,20}$/),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    imageUrl: fc.oneof(
      fc.constant(null),
      fc.webUrl()
    ),
  });

  // Generator: array of 1-10 unique artists
  const artistsArb = fc
    .array(artistArb, { minLength: 1, maxLength: 10 })
    .map((artists) => {
      // Ensure unique IDs
      const seen = new Set();
      return artists.filter((a) => {
        if (seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
      });
    })
    .filter((artists) => artists.length > 0);

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'grid-container';
    document.body.appendChild(container);
    renderer = new GridRenderer(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('showOverlay produces an overlay with .equalizer containing 3-5 .bar children and no .artist-name', () => {
    fc.assert(
      fc.property(artistsArb, (artists) => {
        // Render the grid
        renderer.render(artists);

        // For each artist, call showOverlay and verify overlay structure
        for (const artist of artists) {
          renderer.showOverlay(artist.id);

          const gridItem = container.querySelector(`[data-artist-id="${artist.id}"]`);
          expect(gridItem).not.toBeNull();

          const overlay = gridItem.querySelector('.overlay');
          expect(overlay).not.toBeNull();

          // 1. Overlay contains a .equalizer div
          const equalizer = overlay.querySelector('.equalizer');
          expect(equalizer).not.toBeNull();

          // 2. Between 3 and 5 .bar child elements inside .equalizer
          const bars = equalizer.querySelectorAll('.bar');
          expect(bars.length).toBeGreaterThanOrEqual(3);
          expect(bars.length).toBeLessThanOrEqual(5);

          // 3. No .artist-name element inside the overlay
          const artistNameEl = overlay.querySelector('.artist-name');
          expect(artistNameEl).toBeNull();

          // 4. No text node displaying the artist name inside the overlay
          expect(overlay.textContent).not.toContain(artist.name);

          // Clean up overlay for next iteration
          renderer.hideOverlay(artist.id);
        }
      }),
      { numRuns: 100 }
    );
  });
});
