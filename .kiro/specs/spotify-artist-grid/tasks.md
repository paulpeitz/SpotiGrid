# Implementation Plan: Spotify Artist Grid

## Overview

Inkrementelle Implementierung der SpotiGrid-App als Vanilla-JS-SPA. Die Aufgaben bauen aufeinander auf: Zuerst die Projektstruktur und Konfiguration, dann die einzelnen Module (API, Grid, Audio), anschließend die Orchestrierung und abschließend die Integration. Tests werden als optionale Sub-Tasks nach den jeweiligen Implementierungsschritten eingefügt.

## Tasks

- [x] 1. Projektstruktur und Grundgerüst erstellen
  - [x] 1.1 HTML-Grundstruktur und CSS-Grid-Layout erstellen
    - `index.html` mit Token-Eingabefeld (`<input id="token-input">`), Start-Button, Fehler-Container (`<div id="error-container">`) und Grid-Container (`<div id="grid-container">`) erstellen
    - `style.css` mit CSS-Grid-Layout (4 Spalten, 16px Gap), quadratische Bilder (`object-fit: cover`), Overlay-Styles (halbtransparent mit Künstlername), Platzhalter-Style und Ausgegraut-Kennzeichnung erstellen
    - Script-Tags für alle Module in `index.html` einfügen (type="module")
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 6.1_

  - [x] 1.2 Vitest-Konfiguration und Testinfrastruktur einrichten
    - `package.json` mit Abhängigkeiten (`vitest`, `fast-check`, `jsdom`) erstellen
    - `vitest.config.js` mit `jsdom`-Umgebung konfigurieren
    - Verzeichnisstruktur für Tests anlegen (`tests/`)
    - _Requirements: (Testinfrastruktur)_

  - [x] 1.3 `artists.json` mit 20–40 Spotify Artist IDs erstellen
    - JSON-Array mit mindestens 20 gültigen Spotify Artist IDs befüllen
    - _Requirements: 1.1_

- [x] 2. Spotify-API-Modul implementieren
  - [x] 2.1 `js/spotify-api.js` – Klasse `SpotifyAPI` mit `getArtist()` und `getArtists()` implementieren
    - Konstruktor nimmt Token entgegen, speichert es als Instanzvariable
    - `getArtist(artistId)` sendet `GET /artists/{id}` mit Authorization-Header, gibt `{id, name, imageUrl}` zurück
    - Bildauswahl-Logik: Aus dem `images`-Array das Bild mit der größten `width` auswählen; bei leerem Array `null` zurückgeben
    - `getArtists(artistIds)` parallelisiert Einzelabfragen mit `Promise.allSettled()`, überspringt fehlgeschlagene Requests
    - Fehlerbehandlung: 401 → Auth-Fehler werfen, 404 → null zurückgeben, Timeout nach 10s → Timeout-Fehler werfen
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 2.2 `js/spotify-api.js` – Methode `findPreviewTrack()` implementieren
    - `GET /search?q=artist:{name}&type=track` anfragen
    - Aus `tracks.items` den ersten Eintrag mit nicht-null `preview_url` auswählen
    - Gibt `{previewUrl, trackName}` oder `null` zurück, falls keine Vorschau verfügbar
    - _Requirements: 4.1, 4.5_

  - [x] 2.3 Property-Test für Bildauswahl schreiben
    - **Property 3: Höchstauflösendes Bild wird ausgewählt**
    - Mit fast-check zufällige Arrays von Bildobjekten (`{url, width, height}`) generieren und prüfen, dass immer das Bild mit der größten Breite zurückgegeben wird
    - **Validates: Requirements 2.3**

- [x] 3. JSON-Validierungsmodul implementieren
  - [x] 3.1 Validierungsfunktion `validateArtistIds()` in `js/spotify-api.js` oder separater Hilfsdatei erstellen
    - Prüft: Eingabe ist Array, alle Einträge sind nicht-leere Strings, Länge zwischen 20 und 40
    - Gibt bei Erfolg das Array zurück, bei Fehler ein Objekt mit beschreibender Fehlermeldung
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 3.2 Property-Test für JSON-Validierung (invalide Eingaben) schreiben
    - **Property 1: JSON-Validierung lehnt invalide Eingaben ab**
    - Mit fast-check verschiedene invalide Eingaben generieren (leere Arrays, zu viele/wenige Einträge, nicht-String-Einträge, leere Strings) und prüfen, dass die Validierung ablehnt
    - **Validates: Requirements 1.2, 1.3, 1.4**

  - [x] 3.3 Property-Test für JSON-Validierung (valide Eingaben) schreiben
    - **Property 2: JSON-Validierung akzeptiert valide Eingaben**
    - Mit fast-check Arrays aus 20–40 nicht-leeren Strings generieren und prüfen, dass die Validierung akzeptiert und das Array unverändert zurückgibt
    - **Validates: Requirements 1.1**

- [x] 4. Checkpoint – Basis-Module prüfen
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Grid-Renderer-Modul implementieren
  - [x] 5.1 `js/grid-renderer.js` – Klasse `GridRenderer` mit `render()` implementieren
    - Konstruktor nimmt Container-Element entgegen
    - `render(artists)` erstellt für jeden Künstler ein Grid-Element mit Bild (oder Platzhalter), data-Attribut für die Artist ID
    - Platzhalter-Darstellung bei `imageUrl === null` mit Künstlername als Text
    - Bilder mit `loading="lazy"` für Performance
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 2.4_

  - [x] 5.2 `js/grid-renderer.js` – Overlay-Methoden (`showOverlay`, `hideOverlay`, `markNoPreview`) implementieren
    - `showOverlay(artistId, artistName)` fügt ein Overlay-Element mit dem Künstlernamen über dem Bild ein
    - `hideOverlay(artistId)` entfernt das Overlay-Element
    - `markNoPreview(artistId)` fügt eine visuelle Kennzeichnung hinzu (CSS-Klasse für Ausgegraut-Effekt)
    - _Requirements: 4.2, 4.3, 4.5, 5.2_

- [x] 6. Audio-Player-Modul implementieren
  - [x] 6.1 `js/audio-player.js` – Klasse `AudioPlayer` implementieren
    - Konstruktor erstellt ein einzelnes `<audio>`-Element (Wiederverwendung)
    - `play(previewUrl, onEnded)` setzt `src`, ruft `play()` auf, registriert `ended`-Event
    - `stop()` ruft `pause()` auf und setzt `currentTime = 0`
    - `isPlaying()` gibt `true` zurück, wenn Audio nicht pausiert ist
    - `getCurrentUrl()` gibt die aktuelle `src` zurück oder `null`
    - Stellt sicher, dass immer nur ein Song gleichzeitig abgespielt wird (vorheriger wird gestoppt)
    - _Requirements: 4.1, 4.4, 5.1, 5.3_

  - [x] 6.2 Property-Test für Audio-Zustandsmaschine schreiben
    - **Property 4: Nur ein Song gleichzeitig**
    - Mit fast-check zufällige Sequenzen von Play/Stop-Aktionen generieren und prüfen, dass zu keinem Zeitpunkt mehr als ein Song aktiv ist
    - **Validates: Requirements 4.4, 5.1**

  - [x] 6.3 Property-Test für Stop-Toggle-Verhalten schreiben
    - **Property 5: Stop-Toggle-Verhalten**
    - Mit fast-check prüfen, dass ein erneuter Klick auf den aktuell spielenden Künstler die Wiedergabe stoppt und den Zustand zurücksetzt
    - **Validates: Requirements 5.1, 5.2**

- [x] 7. Checkpoint – UI-Module prüfen
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. App-Modul und Orchestrierung implementieren
  - [x] 8.1 `js/app.js` – Klasse `App` mit Initialisierung und `start()` implementieren
    - Konstruktor nimmt Config-Objekt entgegen (Pfade, Element-IDs)
    - `start()` liest Token aus Eingabefeld, lädt `artists.json` via `fetch()`, validiert mit `validateArtistIds()`, ruft `SpotifyAPI.getArtists()` auf, übergibt Ergebnis an `GridRenderer.render()`
    - Ladezustand im UI anzeigen (Loading-Indicator)
    - `showError(message)` zeigt Fehlermeldung im `#error-container` an
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.6, 2.7, 6.3, 6.4_

  - [x] 8.2 `js/app.js` – Methode `handleArtistClick()` und Event-Wiring implementieren
    - Click-Event-Delegation auf Grid-Container registrieren
    - Bei Klick: Artist ID aus data-Attribut lesen, prüfen ob aktuell abgespielt → Stop oder neuen Song suchen
    - `findPreviewTrack()` aufrufen, bei Erfolg `AudioPlayer.play()` und `GridRenderer.showOverlay()` aufrufen
    - Bei Song-Ende (`onEnded`-Callback): Overlay entfernen, Zustand zurücksetzen
    - Fehlende Vorschau: `markNoPreview()` aufrufen und Klick ignorieren
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3_

  - [x] 8.3 Property-Test für Overlay-Konsistenz schreiben
    - **Property 6: Overlay-Konsistenz**
    - Mit fast-check zufällige Zustandsübergänge (Klick-Sequenzen) simulieren und prüfen, dass Overlay-Sichtbarkeit immer mit `currentlyPlaying` synchron ist
    - **Validates: Requirements 4.2, 4.3, 5.2**

- [x] 9. Integration und Feinschliff
  - [x] 9.1 Token-Eingabe und Fehlerbehandlung verdrahten
    - Start-Button-Event-Listener: Ruft `app.start()` auf
    - Token-Feld validieren (nicht leer), bei leerem Feld Hinweis anzeigen
    - Bei 401-Fehler von der API: Token-Eingabe erneut anzeigen mit Fehlermeldung
    - Fehler-Container bei erneutem Start leeren
    - _Requirements: 6.4, 6.5, 2.7_

  - [x] 9.2 Layout-Shift verhindern und responsive Feinheiten
    - Grid-Elemente mit festen Aspect-Ratio-Platzhaltern versehen (`aspect-ratio: 1`)
    - Bilder erst anzeigen, wenn alle geladen sind (oder progressive Darstellung mit Skeleton)
    - Letzte Reihe korrekt linksbündig ausrichten (CSS Grid Verhalten prüfen)
    - _Requirements: 3.4, 3.5_

  - [x] 9.3 Unit-Tests für Fehlerbehandlung und Integration schreiben
    - Token-Validierung, 401-Handling, Netzwerk-Timeout-Simulation
    - JSON-Ladefehler-Szenarien mit fetch-Mock
    - _Requirements: 1.2, 1.3, 2.6, 2.7, 6.5_

- [x] 10. Final Checkpoint – Alle Tests ausführen
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks mit `*` markiert sind optional und können für ein schnelleres MVP übersprungen werden
- Jede Aufgabe referenziert spezifische Requirements für Nachverfolgbarkeit
- Checkpoints stellen sicher, dass der Code inkrementell validiert wird
- Property-Tests validieren universelle Korrektheitseigenschaften aus dem Design-Dokument
- Unit-Tests validieren spezifische Beispiele und Randfälle
- Die App verwendet kein Build-System – alle Module werden als ES-Module (`type="module"`) direkt im Browser geladen
- Für Tests wird vitest mit jsdom-Umgebung verwendet; fast-check für Property-Based Tests

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.2", "3.3"] },
    { "id": 3, "tasks": ["5.1", "6.1"] },
    { "id": 4, "tasks": ["5.2", "6.2", "6.3"] },
    { "id": 5, "tasks": ["8.1"] },
    { "id": 6, "tasks": ["8.2", "8.3"] },
    { "id": 7, "tasks": ["9.1", "9.2"] },
    { "id": 8, "tasks": ["9.3"] }
  ]
}
```
