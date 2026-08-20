# Implementation Plan: Artist Date Display

## Overview

Erweiterung der SpotiGrid-Anwendung um ein optionales `date`-Feld pro Künstler. Die Implementierung erweitert den Validator für das neue Objekt-Format, passt den Grid-Renderer an um Date-Labels zu rendern, fügt CSS-Styling hinzu, und verbindet alles in der App-Logik. Bestehende Konfigurationen bleiben rückwärtskompatibel.

## Tasks

- [x] 1. Validator erweitern für neues Datenformat
  - [x] 1.1 Erweitere `validateArtistIds` in `js/validate.js` für String- und Objekt-Einträge
    - Akzeptiere sowohl nicht-leere Strings als auch Objekte mit `id` (nicht-leerer String) und optionalem `date` (String, 1–20 Zeichen)
    - Normalisiere String-Einträge zu `{id: entry}` Objekten
    - Gib bei Erfolg ein normalisiertes Array von `{id, date?}` Objekten zurück
    - Behalte bestehende Array- und Längenprüfung (20–40 Einträge) bei
    - Gib spezifische Fehlermeldungen mit Eintrag-Index zurück bei ungültigen Einträgen
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4_

  - [x] 1.2 Schreibe Property-Test für gültige Konfigurationen
    - **Property 1: Gültige Konfigurationen werden akzeptiert**
    - Erstelle `tests/validate-config-valid.property.test.js`
    - Generiere Arrays mit 20–40 gültigen Einträgen (Strings und Objekte gemischt)
    - Prüfe, dass Rückgabe ein normalisiertes Array mit `id` und optionalem `date` ist
    - **Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2**

  - [x] 1.3 Schreibe Property-Test für ungültige Einträge
    - **Property 2: Ungültige Einträge werden abgelehnt**
    - Erstelle `tests/validate-config-invalid.property.test.js`
    - Generiere Arrays mit mindestens einem ungültigen Eintrag (leerer String, Objekt ohne `id`, `date` > 20 Zeichen, etc.)
    - Prüfe, dass Rückgabe `{valid: false, error: string}` ist und der fehlerhafte Eintrag identifiziert wird
    - **Validates: Requirements 1.4, 1.5, 2.4**

  - [x] 1.4 Schreibe Property-Test für Längeneinschränkung
    - **Property 3: Längeneinschränkung wird durchgesetzt**
    - Erstelle `tests/validate-config-length.property.test.js`
    - Generiere Arrays mit ausschließlich gültigen Einträgen, aber Länge < 20 oder > 40
    - Prüfe, dass Rückgabe ein Fehlerobjekt ist
    - **Validates: Requirements 2.3**

  - [x] 1.5 Erweitere bestehende Unit-Tests in `tests/validate.test.js`
    - Füge Beispiele für Objekt-Einträge, gemischte Formate und `date`-Validierung hinzu
    - Teste spezifische Fehlermeldungen bei ungültigem `date`-Feld
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.4_

- [x] 2. Checkpoint - Validator-Tests prüfen
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Grid-Renderer erweitern für Date-Label
  - [x] 3.1 Erweitere `render`-Methode in `js/grid-renderer.js` um Date-Label-Erzeugung
    - Erzeuge ein `span.date-label`-Element nach dem `span.artist-label`, wenn `artist.date` vorhanden ist
    - Setze `textContent` des Date-Labels auf den exakten `date`-Wert
    - Erzeuge kein Date-Label-Element wenn `date` undefined oder null ist
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 3.2 Schreibe Property-Test für Date-Label DOM-Struktur
    - **Property 4: Date_Label DOM-Struktur**
    - Erstelle `tests/date-label-structure.property.test.js`
    - Generiere Künstler mit und ohne `date`-Feld
    - Prüfe, dass `span.date-label` nur bei vorhandenem `date` existiert und nach `span.artist-label` positioniert ist
    - **Validates: Requirements 3.1, 3.2, 3.4**

  - [x] 3.3 Schreibe Property-Test für Date-Label Inhaltsbewahrung
    - **Property 5: Date_Label Inhaltsbewahrung (Round-Trip)**
    - Erstelle `tests/date-label-content.property.test.js`
    - Generiere gültige Datums-Strings (1–20 Zeichen) und rendere Künstler damit
    - Prüfe, dass `textContent` des `span.date-label` exakt dem ursprünglichen String entspricht
    - **Validates: Requirements 3.3**

  - [x] 3.4 Erweitere bestehende Unit-Tests in `tests/grid-renderer.test.js`
    - Teste Date-Label-Erzeugung bei vorhandenem `date`
    - Teste fehlende Date-Label-Erzeugung bei `undefined`/`null`/fehlendem `date`
    - Teste korrekte CSS-Klasse `date-label`
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4. CSS-Styling für Date-Label hinzufügen
  - [x] 4.1 Füge `.date-label`-Styles in `style.css` hinzu
    - Setze `font-size: 0.7rem` (≈82% von 0.85rem des Artist-Labels)
    - Setze `color: #999` für geringeren Kontrast als `#e0e0e0`
    - Setze `text-align: center` für zentrierte Darstellung
    - Setze `white-space: nowrap`, `overflow: hidden`, `text-overflow: ellipsis` für Overflow-Handling
    - Setze `display: block` und `margin-top: 2px` (≤ 4px Abstand)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 5. App-Logik anpassen für Datenfluss
  - [x] 5.1 Passe `_loadGrid` in `js/app.js` an, um normalisierte Objekte zu verarbeiten
    - Extrahiere `id`-Werte für den API-Aufruf aus den normalisierten Objekten
    - Reichere die API-Ergebnisse mit dem `date`-Feld aus den normalisierten Objekten an
    - Übergebe die angereicherten Artist-Objekte (mit `date`) an den Renderer
    - _Requirements: 1.1, 3.1, 3.3_

- [x] 6. Artist-Config aktualisieren
  - [x] 6.1 Aktualisiere `artists.json` mit Beispiel-Datums-Einträgen
    - Wandle einige String-Einträge in Objekt-Format mit `date`-Feld um
    - Behalte gemischtes Format bei (Strings und Objekte) zur Demonstration der Rückwärtskompatibilität
    - _Requirements: 1.1, 2.1, 2.2_

- [x] 7. Checkpoint - Bestehende Tests sicherstellen
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Integration verifizieren
  - [x] 8.1 Schreibe Integration-Tests für den Gesamtfluss
    - Teste den vollständigen Datenfluss: `artists.json` → Validator → App → Renderer
    - Prüfe, dass Date-Labels korrekt im DOM erscheinen bei gemischtem Format
    - Prüfe Rückwärtskompatibilität mit reinen String-Konfigurationen
    - _Requirements: 1.1, 2.1, 2.2, 3.1, 3.2, 3.3_

- [x] 9. Final Checkpoint - Alle Tests bestehen
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Bestehende Property-Tests (`validate-valid.property.test.js`, `validate-invalid.property.test.js`) müssen nach Änderungen am Validator ebenfalls angepasst oder durch die neuen Tests ersetzt werden
- Das Projekt nutzt Vitest mit jsdom-Environment und fast-check für Property-Based Tests

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "4.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "1.5", "3.1"] },
    { "id": 2, "tasks": ["3.2", "3.3", "3.4", "5.1"] },
    { "id": 3, "tasks": ["6.1"] },
    { "id": 4, "tasks": ["8.1"] }
  ]
}
```
