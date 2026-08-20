import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import fc from 'fast-check';
import { GridRenderer } from '../js/grid-renderer.js';

/**
 * Feature: ui-polish, Property 1: Label-Struktur und proportionale Textskalierung
 *
 * Validates: Requirements 2.1, 2.2
 *
 * Für beliebige gültige Künstlerdaten muss die Renderer-Struktur die Bildfläche,
 * das Künstlerlabel und optional das Datumslabel in dieser direkten Reihenfolge
 * erzeugen. Die beiden Label-Schriftgrößen müssen gegenüber ihren Baselines denselben
 * Skalierungsquotienten s > 1 verwenden.
 */
describe('Feature: ui-polish, Property 1: Label-Struktur und proportionale Textskalierung', () => {
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

  const labelTextArb = fc.tuple(
    fc.string({ minLength: 0, maxLength: 500 }),
    fc.constantFrom(
      ' &<>"\' / Künstler',
      'März 2025 — 日本語',
      'line\nbreak\t🎵 & <artist>',
      'A'.repeat(500)
    )
  ).map(([randomText, specialText]) => `${randomText}${specialText}`);

  const artistArb = fc.record({
    id: fc.string({ minLength: 1, maxLength: 20 }),
    name: labelTextArb,
    imageUrl: fc.option(fc.webUrl(), { nil: null }),
    date: fc.option(labelTextArb, { nil: undefined }),
  });

  const artistListArb = fc.array(artistArb, { minLength: 1, maxLength: 20 });

  const css = readFileSync(resolve(process.cwd(), 'style.css'), 'utf8');
  const scale = Number(css.match(/--ui-polish-scale\s*:\s*([\d.]+)/)?.[1]);
  const artistFont = css.match(
    /\.artist-label\s*\{[\s\S]*?font-size\s*:\s*calc\(\s*([\d.]+)rem\s*\*\s*var\(--ui-polish-scale\)\s*\)/
  );
  const dateFont = css.match(
    /\.date-label\s*\{[\s\S]*?font-size\s*:\s*calc\(\s*([\d.]+)rem\s*\*\s*var\(--ui-polish-scale\)\s*\)/
  );

  it('rendert direkte Label-Reihenfolge und einen gemeinsamen Baseline-Schriftquotienten', () => {
    fc.assert(
      fc.property(artistListArb, (artists) => {
        renderer.render(artists);

        expect(scale).toBeGreaterThan(1);
        expect(artistFont).not.toBeNull();
        expect(dateFont).not.toBeNull();

        const artistBaseline = Number(artistFont[1]);
        const dateBaseline = Number(dateFont[1]);
        const artistCurrentSize = artistBaseline * scale;
        const dateCurrentSize = dateBaseline * scale;
        expect(artistCurrentSize / artistBaseline).toBeCloseTo(scale, 10);
        expect(dateCurrentSize / dateBaseline).toBeCloseTo(scale, 10);
        expect(artistCurrentSize / artistBaseline).toBeCloseTo(
          dateCurrentSize / dateBaseline,
          10
        );

        const gridItems = container.querySelectorAll('.grid-item');
        expect(gridItems).toHaveLength(artists.length);

        for (let i = 0; i < artists.length; i++) {
          const gridItem = gridItems[i];
          const artist = artists[i];
          const children = Array.from(gridItem.children);
          const imageWrapper = children[0];
          const artistLabel = children[1];

          expect(imageWrapper.classList.contains('grid-item-image')).toBe(true);
          expect(artistLabel.classList.contains('artist-label')).toBe(true);
          expect(artistLabel.textContent).toBe(artist.name);

          if (artist.date) {
            expect(children[2]?.classList.contains('date-label')).toBe(true);
            expect(children[2].textContent).toBe(artist.date);
            expect(children).toHaveLength(3);
          } else {
            expect(gridItem.querySelector(':scope > .date-label')).toBeNull();
            expect(children).toHaveLength(2);
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});
