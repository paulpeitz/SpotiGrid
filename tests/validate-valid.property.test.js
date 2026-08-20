import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { validateArtistIds } from '../js/validate.js';

/**
 * Feature: spotify-artist-grid, Property 2: JSON-Validierung akzeptiert valide Eingaben
 *
 * Für jedes JSON-Array bestehend aus 20 bis 40 nicht-leeren Strings soll die
 * Validierungsfunktion das Array erfolgreich akzeptieren und ein normalisiertes
 * Array von {id}-Objekten zurückgeben.
 *
 * Validates: Requirements 1.1
 */
describe('Property 2: JSON-Validierung akzeptiert valide Eingaben', () => {
  it('akzeptiert Arrays aus 20–40 nicht-leeren Strings und gibt normalisierte Objekte zurück', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1 }), { minLength: 20, maxLength: 40 }),
        (input) => {
          const result = validateArtistIds(input);

          // Das Ergebnis ist KEIN Fehlerobjekt
          expect(result).not.toHaveProperty('valid', false);

          // Das Ergebnis ist ein Array mit der gleichen Länge
          expect(Array.isArray(result)).toBe(true);
          expect(result).toHaveLength(input.length);

          // Jeder Eintrag ist ein normalisiertes Objekt mit id
          for (let i = 0; i < input.length; i++) {
            expect(result[i]).toEqual({ id: input[i] });
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
