import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { GridRenderer } from '../js/grid-renderer.js';

/**
 * Feature: spotify-artist-grid, Property 6: Overlay-Konsistenz
 *
 * Validates: Requirements 4.2, 4.3, 5.2
 *
 * Für jeden App-Zustand gilt: Wenn `currentlyPlaying` eine Artist ID enthält,
 * dann muss genau ein Overlay für diesen Künstler sichtbar sein.
 * Wenn `currentlyPlaying` null ist, darf kein Overlay sichtbar sein.
 *
 * Getestet wird mit zufälligen Klick-Sequenzen auf eine Menge gerenderter Künstler.
 * Jeder Klick simuliert die App-Logik:
 * - Klick auf den aktuell spielenden Künstler → Stop (hideOverlay, currentlyPlaying = null)
 * - Klick auf einen anderen Künstler → Wechsel (hideOverlay für alten, showOverlay für neuen)
 * - Klick ohne aktive Wiedergabe → Start (showOverlay, currentlyPlaying = artistId)
 */
describe('Feature: spotify-artist-grid, Property 6: Overlay-Konsistenz', () => {
  const testArtists = [
    { id: 'artist-1', name: 'Artist One', imageUrl: 'https://img.spotify.com/1.jpg' },
    { id: 'artist-2', name: 'Artist Two', imageUrl: 'https://img.spotify.com/2.jpg' },
    { id: 'artist-3', name: 'Artist Three', imageUrl: 'https://img.spotify.com/3.jpg' },
    { id: 'artist-4', name: 'Artist Four', imageUrl: 'https://img.spotify.com/4.jpg' },
    { id: 'artist-5', name: 'Artist Five', imageUrl: 'https://img.spotify.com/5.jpg' },
  ];

  let container;
  let renderer;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'grid-container';
    document.body.appendChild(container);
    renderer = new GridRenderer(container);
    renderer.render(testArtists);
  });

  /**
   * Hilfsfunktion: Prüft die Overlay-Konsistenz-Invariante.
   * - Wenn currentlyPlaying gesetzt ist, genau ein Overlay für diesen Künstler
   * - Wenn currentlyPlaying null ist, kein Overlay sichtbar
   */
  function assertOverlayConsistency(currentlyPlaying) {
    const allOverlays = container.querySelectorAll('.overlay');

    if (currentlyPlaying !== null) {
      // Genau ein Overlay muss existieren
      expect(allOverlays.length).toBe(1);

      // Das Overlay muss beim korrekten Künstler sein
      const gridItem = container.querySelector(`[data-artist-id="${currentlyPlaying}"]`);
      expect(gridItem).not.toBeNull();
      const overlay = gridItem.querySelector('.overlay');
      expect(overlay).not.toBeNull();
    } else {
      // Kein Overlay darf sichtbar sein
      expect(allOverlays.length).toBe(0);
    }
  }

  it('Overlay-Sichtbarkeit ist immer mit currentlyPlaying synchron nach jeder Klick-Aktion', () => {
    // Generator: Zufällige Klick-Sequenzen auf die gerenderten Künstler
    const clickActionArb = fc.integer({ min: 0, max: testArtists.length - 1 }).map(
      (index) => testArtists[index]
    );
    const clickSequenceArb = fc.array(clickActionArb, { minLength: 1, maxLength: 30 });

    fc.assert(
      fc.property(clickSequenceArb, (clicks) => {
        // Zustand zurücksetzen: Grid neu rendern
        renderer.render(testArtists);
        let currentlyPlaying = null;

        // Initiale Invariante prüfen
        assertOverlayConsistency(currentlyPlaying);

        for (const clickedArtist of clicks) {
          // Simuliere die App-Logik aus handleArtistClick:
          if (currentlyPlaying === clickedArtist.id) {
            // Erneuter Klick auf den spielenden Künstler → Stop
            renderer.hideOverlay(clickedArtist.id);
            currentlyPlaying = null;
          } else {
            // Klick auf einen anderen (oder ersten) Künstler
            if (currentlyPlaying !== null) {
              // Vorheriges Overlay entfernen
              renderer.hideOverlay(currentlyPlaying);
            }
            // Neues Overlay anzeigen
            renderer.showOverlay(clickedArtist.id);
            currentlyPlaying = clickedArtist.id;
          }

          // Invariante nach jedem Zustandsübergang prüfen
          assertOverlayConsistency(currentlyPlaying);
        }
      }),
      { numRuns: 100 }
    );
  });
});
