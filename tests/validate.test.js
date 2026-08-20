import { describe, it, expect } from 'vitest';
import { validateArtistIds } from '../js/validate.js';

describe('validateArtistIds', () => {
  // Hilfsfunktion: Erzeugt ein valides String-Array mit n Einträgen
  function makeValidStringArray(n) {
    return Array.from({ length: n }, (_, i) => `artist_id_${i}_abcdefgh`);
  }

  // Hilfsfunktion: Erzeugt das erwartete normalisierte Array
  function makeExpectedNormalized(n) {
    return Array.from({ length: n }, (_, i) => ({ id: `artist_id_${i}_abcdefgh` }));
  }

  describe('Erfolgreiche Validierung – String-Einträge', () => {
    it('akzeptiert ein Array mit genau 20 nicht-leeren Strings und normalisiert sie', () => {
      const input = makeValidStringArray(20);
      const result = validateArtistIds(input);
      expect(result).toEqual(makeExpectedNormalized(20));
    });

    it('akzeptiert ein Array mit genau 40 nicht-leeren Strings und normalisiert sie', () => {
      const input = makeValidStringArray(40);
      const result = validateArtistIds(input);
      expect(result).toEqual(makeExpectedNormalized(40));
    });

    it('akzeptiert ein Array mit 30 nicht-leeren Strings und normalisiert sie', () => {
      const input = makeValidStringArray(30);
      const result = validateArtistIds(input);
      expect(result).toEqual(makeExpectedNormalized(30));
    });

    it('gibt ein neues normalisiertes Array zurück (keine Referenz auf Eingabe)', () => {
      const input = makeValidStringArray(25);
      const result = validateArtistIds(input);
      expect(result).not.toBe(input);
      expect(result).toHaveLength(25);
    });
  });

  describe('Erfolgreiche Validierung – Objekt-Einträge', () => {
    it('akzeptiert ein Array mit Objekt-Einträgen mit id', () => {
      const input = Array.from({ length: 20 }, (_, i) => ({ id: `artist_${i}` }));
      const result = validateArtistIds(input);
      expect(result).toEqual(input.map((e) => ({ id: e.id })));
    });

    it('akzeptiert Objekt-Einträge mit id und date', () => {
      const input = Array.from({ length: 20 }, (_, i) => ({
        id: `artist_${i}`,
        date: '15.03.2025',
      }));
      const result = validateArtistIds(input);
      expect(result).toEqual(input.map((e) => ({ id: e.id, date: e.date })));
    });

    it('akzeptiert Objekt-Einträge ohne date (date undefined)', () => {
      const input = Array.from({ length: 20 }, (_, i) => ({ id: `artist_${i}` }));
      const result = validateArtistIds(input);
      for (const entry of result) {
        expect(entry).not.toHaveProperty('date');
      }
    });
  });

  describe('Erfolgreiche Validierung – gemischte Einträge', () => {
    it('akzeptiert gemischte String- und Objekt-Einträge', () => {
      const input = [
        'artist_0',
        { id: 'artist_1', date: 'März 2025' },
        { id: 'artist_2' },
        'artist_3',
        ...Array.from({ length: 16 }, (_, i) => `artist_${i + 4}`),
      ];
      const result = validateArtistIds(input);
      expect(result).toHaveLength(20);
      expect(result[0]).toEqual({ id: 'artist_0' });
      expect(result[1]).toEqual({ id: 'artist_1', date: 'März 2025' });
      expect(result[2]).toEqual({ id: 'artist_2' });
      expect(result[3]).toEqual({ id: 'artist_3' });
    });
  });

  describe('Fehlerhafte Eingaben – kein Array', () => {
    it('lehnt null ab', () => {
      const result = validateArtistIds(null);
      expect(result).toEqual({
        valid: false,
        error: 'Die Datei muss ein JSON-Array enthalten.',
      });
    });

    it('lehnt undefined ab', () => {
      const result = validateArtistIds(undefined);
      expect(result).toEqual({
        valid: false,
        error: 'Die Datei muss ein JSON-Array enthalten.',
      });
    });

    it('lehnt einen String ab', () => {
      const result = validateArtistIds('not an array');
      expect(result).toEqual({
        valid: false,
        error: 'Die Datei muss ein JSON-Array enthalten.',
      });
    });

    it('lehnt ein Objekt ab', () => {
      const result = validateArtistIds({ ids: ['a', 'b'] });
      expect(result).toEqual({
        valid: false,
        error: 'Die Datei muss ein JSON-Array enthalten.',
      });
    });

    it('lehnt eine Zahl ab', () => {
      const result = validateArtistIds(42);
      expect(result).toEqual({
        valid: false,
        error: 'Die Datei muss ein JSON-Array enthalten.',
      });
    });
  });

  describe('Fehlerhafte Eingaben – ungültige Array-Einträge', () => {
    it('lehnt Array mit leeren Strings ab und gibt Position an', () => {
      const input = makeValidStringArray(20);
      input[5] = '';
      const result = validateArtistIds(input);
      expect(result).toEqual({
        valid: false,
        error: "Eintrag an Position 5 ist ungültig: erwartet nicht-leerer String oder Objekt mit 'id'-Feld.",
      });
    });

    it('lehnt Array mit Zahlen ab und gibt Position an', () => {
      const input = makeValidStringArray(20);
      input[0] = 123;
      const result = validateArtistIds(input);
      expect(result).toEqual({
        valid: false,
        error: "Eintrag an Position 0 ist ungültig: erwartet nicht-leerer String oder Objekt mit 'id'-Feld.",
      });
    });

    it('lehnt Array mit null-Einträgen ab und gibt Position an', () => {
      const input = makeValidStringArray(20);
      input[10] = null;
      const result = validateArtistIds(input);
      expect(result).toEqual({
        valid: false,
        error: "Eintrag an Position 10 ist ungültig: erwartet nicht-leerer String oder Objekt mit 'id'-Feld.",
      });
    });

    it('akzeptiert jetzt Objekte mit gültigem id-Feld', () => {
      const input = makeValidStringArray(20);
      input[3] = { id: 'test' };
      const result = validateArtistIds(input);
      expect(result).not.toHaveProperty('valid', false);
      expect(result[3]).toEqual({ id: 'test' });
    });

    it('lehnt Objekte mit leerem id-Feld ab', () => {
      const input = makeValidStringArray(20);
      input[3] = { id: '' };
      const result = validateArtistIds(input);
      expect(result).toEqual({
        valid: false,
        error: "Eintrag an Position 3: 'id' muss ein nicht-leerer String sein.",
      });
    });

    it('lehnt Objekte mit nicht-String id ab', () => {
      const input = makeValidStringArray(20);
      input[7] = { id: 123 };
      const result = validateArtistIds(input);
      expect(result).toEqual({
        valid: false,
        error: "Eintrag an Position 7: 'id' muss ein nicht-leerer String sein.",
      });
    });

    it('lehnt Objekte mit ungültigem date ab (leerer String)', () => {
      const input = makeValidStringArray(20);
      input[2] = { id: 'valid_id', date: '' };
      const result = validateArtistIds(input);
      expect(result).toEqual({
        valid: false,
        error: "Eintrag an Position 2: 'date' muss ein String mit 1–20 Zeichen sein.",
      });
    });

    it('lehnt Objekte mit ungültigem date ab (zu lang)', () => {
      const input = makeValidStringArray(20);
      input[4] = { id: 'valid_id', date: 'a'.repeat(21) };
      const result = validateArtistIds(input);
      expect(result).toEqual({
        valid: false,
        error: "Eintrag an Position 4: 'date' muss ein String mit 1–20 Zeichen sein.",
      });
    });

    it('lehnt Objekte mit ungültigem date ab (nicht-String)', () => {
      const input = makeValidStringArray(20);
      input[1] = { id: 'valid_id', date: 42 };
      const result = validateArtistIds(input);
      expect(result).toEqual({
        valid: false,
        error: "Eintrag an Position 1: 'date' muss ein String mit 1–20 Zeichen sein.",
      });
    });

    it('lehnt Arrays mit Array-Einträgen ab', () => {
      const input = makeValidStringArray(20);
      input[6] = ['nested'];
      const result = validateArtistIds(input);
      expect(result).toEqual({
        valid: false,
        error: "Eintrag an Position 6 ist ungültig: erwartet nicht-leerer String oder Objekt mit 'id'-Feld.",
      });
    });
  });

  describe('Fehlerhafte Eingaben – falsche Anzahl', () => {
    it('lehnt Array mit weniger als 20 Einträgen ab', () => {
      const input = makeValidStringArray(19);
      const result = validateArtistIds(input);
      expect(result).toEqual({
        valid: false,
        error: 'Die Datei muss zwischen 20 und 40 Einträge enthalten.',
      });
    });

    it('lehnt Array mit mehr als 40 Einträgen ab', () => {
      const input = makeValidStringArray(41);
      const result = validateArtistIds(input);
      expect(result).toEqual({
        valid: false,
        error: 'Die Datei muss zwischen 20 und 40 Einträge enthalten.',
      });
    });

    it('lehnt leeres Array ab', () => {
      const result = validateArtistIds([]);
      expect(result).toEqual({
        valid: false,
        error: 'Die Datei muss zwischen 20 und 40 Einträge enthalten.',
      });
    });
  });
});
