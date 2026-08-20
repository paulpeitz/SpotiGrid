import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { GridRenderer } from '../js/grid-renderer.js';

/**
 * Feature: grid-ui-enhancements, Property 2: Artist labels persist through all overlay state changes
 *
 * Validates: Requirements 1.3, 1.5
 *
 * For any rendered grid and for any sequence of showOverlay/hideOverlay calls
 * on arbitrary artist IDs, every `.artist-label` element SHALL remain present
 * in the DOM with unchanged textContent after each operation.
 */
describe('Feature: grid-ui-enhancements, Property 2: Artist labels persist through all overlay state changes', () => {
  let container;
  let renderer;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'grid-container';
    document.body.appendChild(container);
    renderer = new GridRenderer(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  /**
   * Arbitrary: generates a list of 1-10 artists with random names and optional imageUrls.
   */
  const artistArb = fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 0, maxLength: 50 }),
    imageUrl: fc.oneof(
      fc.webUrl(),
      fc.constant(null)
    ),
  });

  const artistListArb = fc.array(artistArb, { minLength: 1, maxLength: 10 });

  /**
   * Helper: asserts that all artist labels are present with correct text.
   */
  function assertLabelsIntact(artists) {
    const labels = container.querySelectorAll('.artist-label');
    expect(labels.length).toBe(artists.length);

    const gridItems = container.querySelectorAll('.grid-item');
    expect(gridItems.length).toBe(artists.length);

    for (let i = 0; i < artists.length; i++) {
      const gridItem = gridItems[i];
      const label = gridItem.querySelector('.artist-label');
      expect(label).not.toBeNull();
      expect(label.textContent).toBe(artists[i].name);
    }
  }

  it('all artist labels remain in DOM with unchanged textContent after random overlay operations', () => {
    fc.assert(
      fc.property(
        artistListArb,
        fc.array(
          fc.record({
            operation: fc.constantFrom('show', 'hide'),
            artistIndex: fc.nat(),
          }),
          { minLength: 1, maxLength: 30 }
        ),
        (artists, operations) => {
          // Render the grid with generated artists
          renderer.render(artists);

          // Verify initial state: all labels present
          assertLabelsIntact(artists);

          // Execute each random overlay operation
          for (const op of operations) {
            const targetIndex = op.artistIndex % artists.length;
            const targetId = artists[targetIndex].id;

            if (op.operation === 'show') {
              renderer.showOverlay(targetId);
            } else {
              renderer.hideOverlay(targetId);
            }

            // After each operation, all labels must still be intact
            assertLabelsIntact(artists);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
