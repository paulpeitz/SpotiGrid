import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { selectLargestImage } from '../js/spotify-api.js';

/**
 * Feature: spotify-artist-grid, Property 3: Höchstauflösendes Bild wird ausgewählt
 *
 * Validates: Requirements 2.3
 *
 * Für jedes nicht-leere Array von Bildobjekten mit unterschiedlichen Breiten
 * soll die Bildauswahlfunktion das Bild mit der größten Breite zurückgeben.
 */
describe('Feature: spotify-artist-grid, Property 3: Höchstauflösendes Bild wird ausgewählt', () => {
  it('gibt immer die URL des Bildes mit der größten Breite zurück', () => {
    // Generator: nicht-leeres Array von Bildobjekten mit eindeutigen Breiten
    const imageArb = fc
      .uniqueArray(fc.integer({ min: 1, max: 10000 }), { minLength: 1, maxLength: 20 })
      .chain((widths) =>
        fc.tuple(
          fc.constant(widths),
          fc.array(fc.integer({ min: 1, max: 10000 }), {
            minLength: widths.length,
            maxLength: widths.length,
          })
        )
      )
      .map(([widths, heights]) =>
        widths.map((width, i) => ({
          url: `https://img.spotify.com/${width}x${heights[i]}.jpg`,
          width,
          height: heights[i],
        }))
      );

    fc.assert(
      fc.property(imageArb, (images) => {
        const result = selectLargestImage(images);

        // Bestimme die maximale Breite
        const maxWidth = Math.max(...images.map((img) => img.width));
        const expectedImage = images.find((img) => img.width === maxWidth);

        expect(result).toBe(expectedImage.url);
      }),
      { numRuns: 100 }
    );
  });
});
