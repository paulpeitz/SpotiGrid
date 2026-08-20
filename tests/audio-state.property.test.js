import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { AudioPlayer } from '../js/audio-player.js';

/**
 * Feature: spotify-artist-grid, Property 4: Nur ein Song gleichzeitig
 *
 * Validates: Requirements 4.4, 5.1
 *
 * Für jede Sequenz von Play/Stop-Aktionen soll zu keinem Zeitpunkt mehr als
 * ein Song aktiv sein. Nach jeder Aktion gilt:
 * - Es ist höchstens ein Song aktiv (getCurrentUrl ist entweder eine URL oder null)
 * - Wenn getCurrentUrl eine URL zurückgibt, ist es genau die zuletzt per play() gesetzte
 * - Wenn getCurrentUrl null ist, wurde zuletzt stop() aufgerufen oder noch nie play()
 *
 * Hinweis: In jsdom sind HTMLMediaElement.play()/pause() nicht implementiert,
 * daher wird der Zustand über getCurrentUrl() geprüft (wie im Design empfohlen).
 */
describe('Feature: spotify-artist-grid, Property 4: Nur ein Song gleichzeitig', () => {
  // Stub HTMLMediaElement play/pause um jsdom "not implemented" Warnungen zu unterdrücken
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  });

  it('nach jeder Sequenz von Play/Stop-Aktionen ist höchstens ein Song aktiv', () => {
    // Arbitrary für eine einzelne Aktion: entweder play mit einer zufälligen URL oder stop
    const actionArb = fc.oneof(
      fc.stringMatching(/^https:\/\/preview\.[a-z]{1,10}\.com\/track[0-9]{1,5}\.mp3$/).map(
        (url) => ({ type: 'play', url })
      ),
      fc.constant({ type: 'stop' })
    );

    // Arbitrary für eine Sequenz von Aktionen (mindestens 1, bis zu 50)
    const actionSequenceArb = fc.array(actionArb, { minLength: 1, maxLength: 50 });

    fc.assert(
      fc.property(actionSequenceArb, (actions) => {
        const player = new AudioPlayer();

        // Tracke den erwarteten Zustand
        let expectedUrl = null;

        for (const action of actions) {
          if (action.type === 'play') {
            player.play(action.url, () => {});
            expectedUrl = action.url;
          } else {
            player.stop();
            expectedUrl = null;
          }

          // Invariante 1: Zu jedem Zeitpunkt ist höchstens ein Song aktiv
          const currentUrl = player.getCurrentUrl();

          if (expectedUrl !== null) {
            // Genau ein Song aktiv – es ist der zuletzt per play() gesetzte
            expect(currentUrl).toBe(expectedUrl);
            expect(typeof currentUrl).toBe('string');
            expect(currentUrl.length).toBeGreaterThan(0);
          } else {
            // Kein Song aktiv
            expect(currentUrl).toBeNull();
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});
