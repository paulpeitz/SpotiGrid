import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateArtistIds } from '../js/validate.js';

/**
 * Feature: artist-date-display, Property 2: Ungültige Einträge werden abgelehnt
 *
 * For any Array mit 20–40 Einträgen, das mindestens einen ungültigen Eintrag enthält
 * (Eintrag ist weder nicht-leerer String noch Objekt mit gültigem `id`; oder Objekt hat
 * `date` das kein String ist, leer ist, oder >20 Zeichen hat), soll der Validator ein
 * Fehlerobjekt `{valid: false, error: string}` zurückgeben, dessen Fehlermeldung den
 * fehlerhaften Eintrag identifiziert.
 *
 * Validates: Requirements 1.4, 1.5, 2.4
 */
describe('Feature: artist-date-display, Property 2: Ungültige Einträge werden abgelehnt', () => {
  const NUM_RUNS = 50;

  // Generator für gültige Einträge (nicht-leerer String oder Objekt mit gültigem id und optionalem date)
  const validEntryArb = fc.oneof(
    fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
    fc.record({
      id: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
    }),
    fc.record({
      id: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
      date: fc.string({ minLength: 1, maxLength: 20 }),
    })
  );

  // Generator für ungültige Einträge
  const invalidEntryArb = fc.oneof(
    // Leerer String
    fc.constant(''),
    // Zahl
    fc.integer(),
    // null
    fc.constant(null),
    // Boolean
    fc.boolean(),
    // Array (kein gültiger Eintrag)
    fc.array(fc.anything(), { minLength: 0, maxLength: 3 }),
    // Objekt ohne `id`-Feld
    fc.record({ name: fc.string() }),
    // Objekt mit leerem `id`
    fc.record({ id: fc.constant('') }),
    // Objekt mit nicht-String `id`
    fc.record({ id: fc.integer() }),
    // Objekt mit gültigem `id` aber leerem `date`
    fc.record({
      id: fc.string({ minLength: 1, maxLength: 20 }),
      date: fc.constant(''),
    }),
    // Objekt mit gültigem `id` aber `date` > 20 Zeichen
    fc.record({
      id: fc.string({ minLength: 1, maxLength: 20 }),
      date: fc.string({ minLength: 21, maxLength: 40 }),
    }),
    // Objekt mit gültigem `id` aber `date` ist kein String
    fc.record({
      id: fc.string({ minLength: 1, maxLength: 20 }),
      date: fc.oneof(fc.integer(), fc.boolean(), fc.constant(null), fc.array(fc.anything(), { maxLength: 2 })),
    })
  );

  it('lehnt Arrays mit mindestens einem ungültigen Eintrag ab und gibt {valid: false, error: string} zurück', () => {
    fc.assert(
      fc.property(
        // Array-Länge zwischen 20 und 40
        fc.integer({ min: 20, max: 40 }),
        // Position des ungültigen Eintrags
        fc.integer({ min: 0, max: 39 }),
        // Der ungültige Eintrag selbst
        invalidEntryArb,
        (arrayLen, insertIdx, invalidEntry) => {
          // Erzeuge ein Array aus gültigen Einträgen
          const input = Array.from({ length: arrayLen }, (_, i) => `valid_artist_${i}`);

          // Setze den ungültigen Eintrag an einer gültigen Position
          const idx = insertIdx % arrayLen;
          input[idx] = invalidEntry;

          const result = validateArtistIds(input);

          // Prüfe Fehlerobjekt-Struktur
          expect(result).toHaveProperty('valid', false);
          expect(result).toHaveProperty('error');
          expect(typeof result.error).toBe('string');
          expect(result.error.length).toBeGreaterThan(0);

          // Prüfe, dass die Fehlermeldung den fehlerhaften Eintrag (Position) identifiziert
          expect(result.error).toContain(`Position ${idx}`);
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  it('identifiziert ungültige Objekte ohne id-Feld', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 20, max: 40 }),
        fc.integer({ min: 0, max: 39 }),
        (arrayLen, insertIdx) => {
          const input = Array.from({ length: arrayLen }, (_, i) => `valid_artist_${i}`);
          const idx = insertIdx % arrayLen;

          // Objekt ohne id-Feld
          input[idx] = { name: 'test', genre: 'rock' };

          const result = validateArtistIds(input);

          expect(result).toHaveProperty('valid', false);
          expect(result.error).toContain(`Position ${idx}`);
          expect(result.error).toContain("'id' muss ein nicht-leerer String sein");
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  it('identifiziert Objekte mit ungültigem date-Feld (leer, zu lang, nicht-String)', () => {
    const invalidDateArb = fc.oneof(
      // Leerer date-String
      fc.constant(''),
      // date > 20 Zeichen
      fc.string({ minLength: 21, maxLength: 40 }),
      // date ist kein String
      fc.integer(),
      fc.boolean(),
      fc.constant(null)
    );

    fc.assert(
      fc.property(
        fc.integer({ min: 20, max: 40 }),
        fc.integer({ min: 0, max: 39 }),
        invalidDateArb,
        (arrayLen, insertIdx, invalidDate) => {
          const input = Array.from({ length: arrayLen }, (_, i) => `valid_artist_${i}`);
          const idx = insertIdx % arrayLen;

          // Objekt mit gültigem id aber ungültigem date
          input[idx] = { id: 'valid_id_123', date: invalidDate };

          const result = validateArtistIds(input);

          expect(result).toHaveProperty('valid', false);
          expect(result.error).toContain(`Position ${idx}`);
          expect(result.error).toContain("'date' muss ein String mit 1–20 Zeichen sein");
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  it('identifiziert leere Strings als ungültige Einträge', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 20, max: 40 }),
        fc.integer({ min: 0, max: 39 }),
        (arrayLen, insertIdx) => {
          const input = Array.from({ length: arrayLen }, (_, i) => `valid_artist_${i}`);
          const idx = insertIdx % arrayLen;
          input[idx] = '';

          const result = validateArtistIds(input);

          expect(result).toHaveProperty('valid', false);
          expect(result.error).toContain(`Position ${idx}`);
          expect(result.error).toContain("erwartet nicht-leerer String oder Objekt mit 'id'-Feld");
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  it('identifiziert nicht-String/nicht-Objekt-Typen als ungültig (Zahlen, Booleans, null, Arrays)', () => {
    const nonStringNonObjectArb = fc.oneof(
      fc.integer(),
      fc.constant(null),
      fc.boolean(),
      fc.array(fc.anything(), { minLength: 0, maxLength: 3 })
    );

    fc.assert(
      fc.property(
        fc.integer({ min: 20, max: 40 }),
        fc.integer({ min: 0, max: 39 }),
        nonStringNonObjectArb,
        (arrayLen, insertIdx, invalidEntry) => {
          const input = Array.from({ length: arrayLen }, (_, i) => `valid_artist_${i}`);
          const idx = insertIdx % arrayLen;
          input[idx] = invalidEntry;

          const result = validateArtistIds(input);

          expect(result).toHaveProperty('valid', false);
          expect(result.error).toContain(`Position ${idx}`);
          expect(result.error).toContain("erwartet nicht-leerer String oder Objekt mit 'id'-Feld");
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });
});
