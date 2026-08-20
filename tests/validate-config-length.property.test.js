import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { validateArtistIds } from '../js/validate.js';

/**
 * Feature: artist-date-display, Property 3: Längeneinschränkung wird durchgesetzt
 *
 * For any Array von ausschließlich gültigen Einträgen, dessen Länge außerhalb
 * des Bereichs 20–40 liegt, soll der Validator ein Fehlerobjekt zurückgeben.
 *
 * Validates: Requirements 2.3
 */

// Generator für einen gültigen Eintrag (String oder Objekt mit id und optionalem date)
const validEntryArb = fc.oneof(
  // Nicht-leerer String
  fc.string({ minLength: 1 }),
  // Objekt mit id, ohne date
  fc.record({ id: fc.string({ minLength: 1 }) }),
  // Objekt mit id und gültigem date (1–20 Zeichen)
  fc.record({
    id: fc.string({ minLength: 1 }),
    date: fc.string({ minLength: 1, maxLength: 20 }),
  }),
);

describe('Property 3: Längeneinschränkung wird durchgesetzt', () => {
  it('lehnt Arrays mit gültigen Einträgen aber Länge 0–19 ab', () => {
    fc.assert(
      fc.property(
        fc.array(validEntryArb, { minLength: 0, maxLength: 19 }),
        (input) => {
          const result = validateArtistIds(input);

          // Muss ein Fehlerobjekt sein
          expect(result).toHaveProperty('valid', false);
          expect(result).toHaveProperty(
            'error',
            'Die Datei muss zwischen 20 und 40 Einträge enthalten.',
          );
        },
      ),
      { numRuns: 50 },
    );
  });

  it('lehnt Arrays mit gültigen Einträgen aber Länge 41–100 ab', () => {
    fc.assert(
      fc.property(
        fc.array(validEntryArb, { minLength: 41, maxLength: 100 }),
        (input) => {
          const result = validateArtistIds(input);

          // Muss ein Fehlerobjekt sein
          expect(result).toHaveProperty('valid', false);
          expect(result).toHaveProperty(
            'error',
            'Die Datei muss zwischen 20 und 40 Einträge enthalten.',
          );
        },
      ),
      { numRuns: 50 },
    );
  });
});
