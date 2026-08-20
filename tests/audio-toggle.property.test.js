import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { AudioPlayer } from '../js/audio-player.js';

/**
 * Feature: spotify-artist-grid, Property 5: Stop-Toggle-Verhalten
 *
 * Validates: Requirements 5.1, 5.2
 *
 * Für jeden Künstler, dessen Song gerade abgespielt wird, soll ein erneuter Klick
 * auf denselben Künstler die Wiedergabe stoppen und das Overlay entfernen, sodass
 * der Zustand dem Ausgangszustand (kein Song, kein Overlay) entspricht.
 *
 * Getestet wird: play(url) → stop() → Zustand ist vollständig zurückgesetzt.
 */
describe('Feature: spotify-artist-grid, Property 5: Stop-Toggle-Verhalten', () => {
  let player;

  beforeEach(() => {
    player = new AudioPlayer();
  });

  it('nach play(url) gefolgt von stop() ist der Zustand vollständig zurückgesetzt', () => {
    // Generator: zufällige Preview-URLs als nicht-leere Strings
    const previewUrlArb = fc.webUrl();

    fc.assert(
      fc.property(previewUrlArb, (url) => {
        // Callback-Tracker um zu prüfen, ob der Callback nach stop() noch ausgelöst wird
        let callbackCalled = false;
        const onEnded = () => {
          callbackCalled = true;
        };

        // Simulate: Klick auf Künstler → play
        player.play(url, onEnded);

        // Simulate: Erneuter Klick auf denselben Künstler → stop (Toggle)
        player.stop();

        // Property 1: getCurrentUrl() gibt null zurück
        expect(player.getCurrentUrl()).toBeNull();

        // Property 2: currentTime ist 0
        expect(player.audio.currentTime).toBe(0);

        // Property 3: Der ended-Callback ist nicht mehr registriert
        // (Dispatching 'ended' event darf den Original-Callback nicht auslösen)
        callbackCalled = false;
        player.audio.dispatchEvent(new Event('ended'));
        expect(callbackCalled).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
