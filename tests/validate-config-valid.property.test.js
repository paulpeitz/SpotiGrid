import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { validateArtistIds } from '../js/validate.js';

/**
 * Feature: artist-date-display, Property 1: Gültige Konfigurationen werden akzeptiert
 *
 * For any Array mit 20–40 Einträgen, wobei jeder Eintrag entweder ein nicht-leerer
 * String oder ein Objekt mit nicht-leerem `id`-String und optionalem `date`-String
 * (1–20 Zeichen) ist, soll der Validator das Array akzeptieren und ein normalisiertes
 * Array von Objekten mit `id` (und optionalem `date`) zurückgeben.
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2
 */
describe('Property 1: Gültige Konfigurationen werden akzeptiert', () => {
  // Arbitrary für einen nicht-leeren String-Eintrag
  const stringEntry = fc.string({ minLength: 1 });

  // Arbitrary für ein Objekt mit id (ohne date)
  const objectEntryWithoutDate = fc.record({
    id: fc.string({ minLength: 1 }),
  });

  // Arbitrary für ein Objekt mit id und date (1–20 Zeichen)
  const objectEntryWithDate = fc.record({
    id: fc.string({ minLength: 1 }),
    date: fc.string({ minLength: 1, maxLength: 20 }),
  });

  // Arbitrary für einen gemischten Eintrag (String oder Objekt)
  const mixedEntry = fc.oneof(stringEntry, objectEntryWithoutDate, objectEntryWithDate);

  it('akzeptiert gemischte Arrays aus 20–40 gültigen Einträgen und gibt normalisierte Objekte zurück', () => {
    fc.assert(
      fc.property(
        fc.array(mixedEntry, { minLength: 20, maxLength: 40 }),
        (input) => {
          const result = validateArtistIds(input);

          // Das Ergebnis ist KEIN Fehlerobjekt
          expect(result).not.toHaveProperty('valid', false);

          // Das Ergebnis ist ein Array mit der gleichen Länge
          expect(Array.isArray(result)).toBe(true);
          expect(result).toHaveLength(input.length);

          // Jeder Eintrag ist ein normalisiertes Objekt mit id
          for (let i = 0; i < input.length; i++) {
            const entry = input[i];
            const normalized = result[i];

            // Muss ein Objekt mit id sein
            expect(normalized).toHaveProperty('id');
            expect(typeof normalized.id).toBe('string');
            expect(normalized.id.length).toBeGreaterThan(0);

            if (typeof entry === 'string') {
              // String-Einträge werden zu {id: entry} normalisiert
              expect(normalized).toEqual({ id: entry });
            } else if (entry.date !== undefined) {
              // Objekt mit date behält date bei
              expect(normalized).toEqual({ id: entry.id, date: entry.date });
            } else {
              // Objekt ohne date hat kein date-Feld
              expect(normalized).toEqual({ id: entry.id });
            }
          }
        },
      ),
      { numRuns: 50 },
    );
  });
});
