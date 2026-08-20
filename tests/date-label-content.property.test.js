import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import fc from 'fast-check';
import { GridRenderer } from '../js/grid-renderer.js';

const styleSheet = readFileSync(resolve(process.cwd(), 'style.css'), 'utf8');

function cssRuleFor(selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = styleSheet.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`));
  expect(match).not.toBeNull();
  return match[1];
}

// Arbitrary-length values always include punctuation, whitespace, or Unicode so
// both full text preservation and overflow behavior are exercised together.
const labelTextArb = fc.tuple(
  fc.string({ minLength: 0, maxLength: 500 }),
  fc.constantFrom(
    ' &<>"\' / Künstler',
    'März 2025 — 日本語',
    'line\nbreak\t🎵 & <date>',
    'D'.repeat(500)
  )
).map(([randomText, specialText]) => `${randomText}${specialText}`);

/**
 * Feature: artist-date-display, Property 5: Date_Label Inhaltsbewahrung (Round-Trip)
 *
 * Validates: Requirements 3.3
 *
 * For any gültigen Datums-String (1–20 Zeichen), wenn ein Künstler mit diesem
 * Datum gerendert wird, soll das textContent des span.date-label-Elements exakt
 * dem ursprünglichen Datums-String entsprechen.
 */
describe('Feature: artist-date-display, Property 5: Date_Label Inhaltsbewahrung (Round-Trip)', () => {
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

  it('textContent of span.date-label exactly matches the original date string', () => {
    fc.assert(
      fc.property(labelTextArb, (dateString) => {
        const artist = {
          id: 'test-artist-id',
          name: 'Test Artist',
          imageUrl: null,
          date: dateString,
        };

        renderer.render([artist]);

        const dateLabel = container.querySelector('span.date-label');
        expect(dateLabel).not.toBeNull();
        expect(dateLabel.textContent).toBe(dateString);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: ui-polish, Property 2: Label-Inhalte und Overflow-Invariante
   *
   * Validates: Requirements 2.3, 2.4
   *
   * For arbitrary long artist/date strings, rendering preserves exact
   * textContent and both labels retain the complete ellipsis overflow contract.
   */
  it('preserves arbitrary artist/date text and the complete overflow contract', () => {
    fc.assert(
      fc.property(labelTextArb, labelTextArb, (artistName, dateString) => {
        renderer.render([{
          id: 'test-artist-id',
          name: artistName,
          imageUrl: null,
          date: dateString,
        }]);

        const artistLabel = container.querySelector('.artist-label');
        const dateLabel = container.querySelector('.date-label');
        expect(artistLabel).not.toBeNull();
        expect(dateLabel).not.toBeNull();
        expect(artistLabel.textContent).toBe(artistName);
        expect(dateLabel.textContent).toBe(dateString);

        for (const selector of ['.artist-label', '.date-label']) {
          const rule = cssRuleFor(selector);
          expect(rule).toMatch(/white-space\s*:\s*nowrap/);
          expect(rule).toMatch(/overflow\s*:\s*hidden/);
          expect(rule).toMatch(/text-overflow\s*:\s*ellipsis/);
        }
      }),
      { numRuns: 100 }
    );
  });
});
