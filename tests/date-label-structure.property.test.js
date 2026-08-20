import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { GridRenderer } from '../js/grid-renderer.js';

/**
 * Feature: artist-date-display, Property 4: Date_Label DOM-Struktur
 *
 * Validates: Requirements 3.1, 3.2, 3.4
 *
 * For any gerenderter Künstler mit einem `date`-Feld soll das zugehörige Grid-Item
 * ein `span.date-label`-Element enthalten, das ein eigenständiges DOM-Element nach
 * dem `span.artist-label` ist; und für jeden Künstler ohne `date`-Feld (oder mit
 * `undefined`/`null`) soll kein `span.date-label`-Element existieren.
 */
describe('Feature: artist-date-display, Property 4: Date_Label DOM-Struktur', () => {
  let container;
  let renderer;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'grid-container';
    document.body.appendChild(container);
    renderer = new GridRenderer(container);
  });

  afterEach(() => {
    container.remove();
  });

  // Generator for an artist WITH a date field (truthy string)
  const artistWithDateArb = fc.record({
    id: fc.string({ minLength: 1, maxLength: 20 }),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    imageUrl: fc.option(fc.webUrl(), { nil: null }),
    date: fc.string({ minLength: 1, maxLength: 20 }),
  });

  // Generator for an artist WITHOUT a date field (undefined/null/absent)
  const artistWithoutDateArb = fc.oneof(
    // No date property at all
    fc.record({
      id: fc.string({ minLength: 1, maxLength: 20 }),
      name: fc.string({ minLength: 1, maxLength: 50 }),
      imageUrl: fc.option(fc.webUrl(), { nil: null }),
    }),
    // date is undefined
    fc.record({
      id: fc.string({ minLength: 1, maxLength: 20 }),
      name: fc.string({ minLength: 1, maxLength: 50 }),
      imageUrl: fc.option(fc.webUrl(), { nil: null }),
      date: fc.constant(undefined),
    }),
    // date is null
    fc.record({
      id: fc.string({ minLength: 1, maxLength: 20 }),
      name: fc.string({ minLength: 1, maxLength: 50 }),
      imageUrl: fc.option(fc.webUrl(), { nil: null }),
      date: fc.constant(null),
    })
  );

  // Mixed list of artists with and without dates
  const mixedArtistListArb = fc.array(
    fc.oneof(artistWithDateArb, artistWithoutDateArb),
    { minLength: 1, maxLength: 10 }
  );

  it('span.date-label exists only when date is a truthy string and is positioned after span.artist-label', () => {
    fc.assert(
      fc.property(mixedArtistListArb, (artists) => {
        renderer.render(artists);

        const gridItems = container.querySelectorAll('.grid-item');
        expect(gridItems.length).toBe(artists.length);

        for (let i = 0; i < artists.length; i++) {
          const gridItem = gridItems[i];
          const artist = artists[i];
          const dateLabel = gridItem.querySelector(':scope > span.date-label');
          const artistLabel = gridItem.querySelector(':scope > span.artist-label');

          if (artist.date) {
            // When date is a truthy string, span.date-label must exist
            expect(dateLabel).not.toBeNull();

            // span.date-label must come AFTER span.artist-label in DOM order
            const children = Array.from(gridItem.children);
            const artistLabelIndex = children.indexOf(artistLabel);
            const dateLabelIndex = children.indexOf(dateLabel);
            expect(dateLabelIndex).toBeGreaterThan(artistLabelIndex);
          } else {
            // When date is undefined/null/absent, no span.date-label should exist
            expect(dateLabel).toBeNull();
          }
        }
      }),
      { numRuns: 50 }
    );
  });
});
