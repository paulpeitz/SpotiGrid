/**
 * Validiert die Artist-Konfiguration.
 *
 * Akzeptiert sowohl das bestehende String-Format als auch das neue Objekt-Format
 * mit `id` und optionalem `date`-Feld. String-Einträge werden zu {id: entry} normalisiert.
 *
 * Prüft:
 * - Eingabe ist ein Array
 * - Länge zwischen 20 und 40 (inklusive)
 * - Jeder Eintrag ist entweder ein nicht-leerer String oder ein Objekt mit gültigem `id` und optionalem `date`
 *
 * @param {*} input - Die zu validierende Eingabe
 * @returns {Array<{id: string, date?: string}> | {valid: false, error: string}}
 *   Bei Erfolg: normalisiertes Array von Artist-Objekten
 *   Bei Fehler: Objekt mit valid=false und Fehlermeldung
 */
export function validateArtistIds(input) {
  // Prüfe ob Eingabe ein Array ist
  if (!Array.isArray(input)) {
    return {
      valid: false,
      error: 'Die Datei muss ein JSON-Array enthalten.',
    };
  }

  // Prüfe die Anzahl der Einträge (20–40)
  if (input.length < 20 || input.length > 40) {
    return {
      valid: false,
      error: 'Die Datei muss zwischen 20 und 40 Einträge enthalten.',
    };
  }

  // Validiere und normalisiere jeden Eintrag
  const normalized = [];

  for (let i = 0; i < input.length; i++) {
    const entry = input[i];

    if (typeof entry === 'string') {
      // String-Eintrag: muss nicht-leer sein
      if (entry.length === 0) {
        return {
          valid: false,
          error: `Eintrag an Position ${i} ist ungültig: erwartet nicht-leerer String oder Objekt mit 'id'-Feld.`,
        };
      }
      normalized.push({ id: entry });
    } else if (entry !== null && typeof entry === 'object' && !Array.isArray(entry)) {
      // Objekt-Eintrag: prüfe `id`
      if (typeof entry.id !== 'string' || entry.id.length === 0) {
        return {
          valid: false,
          error: `Eintrag an Position ${i}: 'id' muss ein nicht-leerer String sein.`,
        };
      }

      // Prüfe optionales `date`-Feld
      if (entry.date !== undefined) {
        if (typeof entry.date !== 'string' || entry.date.length < 1 || entry.date.length > 20) {
          return {
            valid: false,
            error: `Eintrag an Position ${i}: 'date' muss ein String mit 1–20 Zeichen sein.`,
          };
        }
        normalized.push({ id: entry.id, date: entry.date });
      } else {
        normalized.push({ id: entry.id });
      }
    } else {
      // Weder String noch gültiges Objekt
      return {
        valid: false,
        error: `Eintrag an Position ${i} ist ungültig: erwartet nicht-leerer String oder Objekt mit 'id'-Feld.`,
      };
    }
  }

  return normalized;
}
