import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateArtistIds } from '../js/validate.js';

/**
 * Feature: spotify-artist-grid, Property 1: JSON-Validierung lehnt invalide Eingaben ab
 *
 * Für jedes JSON-Dokument, das kein Array aus gültigen Einträgen (nicht-leere Strings
 * oder Objekte mit gültigem `id` und optionalem `date`) mit einer Länge zwischen 20
 * und 40 ist, soll die Validierungsfunktion eine entsprechende Fehlermeldung zurückgeben.
 *
 * Validates: Requirements 1.2, 1.3, 1.4
 */
describe('Property 1: JSON-Validierung lehnt invalide Eingaben ab', () => {
  const NUM_RUNS = 100;

  it('lehnt Nicht-Array-Werte ab (Strings, Zahlen, Objekte, null, undefined, Booleans)', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string(),
          fc.integer(),
          fc.double(),
          fc.boolean(),
          fc.constant(null),
          fc.constant(undefined),
          fc.object()
        ),
        (input) => {
          const result = validateArtistIds(input);
          expect(result).toHaveProperty('valid', false);
          expect(result).toHaveProperty('error');
          expect(result.error).toBe('Die Datei muss ein JSON-Array enthalten.');
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  it('lehnt Arrays mit zu wenigen Einträgen ab (< 20 gültige Einträge)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 19 }).chain((len) =>
          fc.array(fc.string({ minLength: 1 }), { minLength: len, maxLength: len })
        ),
        (input) => {
          const result = validateArtistIds(input);
          expect(result).toHaveProperty('valid', false);
          expect(result).toHaveProperty('error');
          expect(result.error).toBe('Die Datei muss zwischen 20 und 40 Einträge enthalten.');
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  it('lehnt Arrays mit zu vielen Einträgen ab (> 40 gültige Einträge)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 41, max: 100 }).chain((len) =>
          fc.array(fc.string({ minLength: 1 }), { minLength: len, maxLength: len })
        ),
        (input) => {
          const result = validateArtistIds(input);
          expect(result).toHaveProperty('valid', false);
          expect(result).toHaveProperty('error');
          expect(result.error).toBe('Die Datei muss zwischen 20 und 40 Einträge enthalten.');
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  it('lehnt Arrays mit ungültigen Einträgen ab (weder String noch gültiges Objekt)', () => {
    // Generiere ungültige Werte die weder nicht-leere Strings noch gültige Objekte sind
    const invalidEntryArb = fc.oneof(
      fc.integer(),
      fc.double(),
      fc.boolean(),
      fc.constant(null),
      fc.constant(undefined),
      fc.array(fc.anything(), { maxLength: 3 }),
      fc.constant('')  // leerer String
    );

    fc.assert(
      fc.property(
        fc.integer({ min: 20, max: 40 }),
        fc.integer({ min: 0, max: 39 }),
        invalidEntryArb,
        (arrayLen, insertIdx, invalidValue) => {
          // Erzeuge ein Array aus gültigen Strings
          const input = Array.from({ length: arrayLen }, (_, i) => `artist_${i}`);
          // Ersetze einen Eintrag mit einem ungültigen Wert
          const idx = insertIdx % arrayLen;
          input[idx] = invalidValue;

          const result = validateArtistIds(input);
          expect(result).toHaveProperty('valid', false);
          expect(result).toHaveProperty('error');
          expect(result.error.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  it('lehnt Arrays mit leeren Strings ab', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 20, max: 40 }),
        fc.integer({ min: 0, max: 39 }),
        (arrayLen, insertIdx) => {
          // Erzeuge ein Array aus gültigen Strings
          const input = Array.from({ length: arrayLen }, (_, i) => `artist_${i}`);
          // Ersetze einen Eintrag mit einem leeren String
          const idx = insertIdx % arrayLen;
          input[idx] = '';

          const result = validateArtistIds(input);
          expect(result).toHaveProperty('valid', false);
          expect(result).toHaveProperty('error');
          expect(result.error).toContain(`Position ${idx}`);
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });
});
