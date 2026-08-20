# Implementation Plan: UI-Polish

## Overview

Minimaler, reversibler UI-Patch für die bestehende SpotiGrid-Anwendung. Die Authentifizierungs-, Token-, API-, Player- und Renderer-Logik bleibt unverändert; angepasst werden nur die Sichtbarkeit der vorhandenen Status-/Logout-Elemente, die CSS-Ableitungen über einen gemeinsamen Skalierungsfaktor und die dazugehörigen Regressionstests.

## Tasks

- [x] 1. Authentifizierungsbereich auf dauerhaft verborgenen Status und Logout begrenzen
  - [x] 1.1 Markup-Vertrag in `index.html` absichern
    - `#user-info` und `#logout-button` im bestehenden `#auth-section` mit dauerhaftem `hidden`-Zustand beibehalten bzw. sicherstellen.
    - `#login-button` mit bestehendem Typ, Label, ID, Position und ohne Änderung am bestehenden Login-Auslöser erhalten.
    - Kein neues Auth-Element und keine Entfernung der Kompatibilitäts-IDs einführen.
    - _Requirements: 1.1, 1.2, 5.2_

  - [x] 1.2 Sichtbarkeitszuweisungen in `js/app.js` minimal anpassen
    - In `_onAuthenticated()` `#user-info` und `#logout-button` weiterhin explizit verborgen halten; `#login-button` wie bisher ausblenden.
    - In `logout()` die vorhandenen Rücksetzungen beibehalten: Login sichtbar, Status-/Logout-Elemente verborgen.
    - `_setupLoginButton()`, PKCE-Weiterleitung, Session-Wiederherstellung, Token-Verarbeitung, API-/Player-Initialisierung, Grid-Laden und Fehlerpfade unverändert lassen.
    - Keine Änderungen an `TokenManager`, `SpotifyAPI`, `SpotifyPlayer` oder Overlay-Lebenszyklus vornehmen.
    - _Requirements: 1.1, 1.2, 1.3_

  - [x]* 1.3 Property-Test für dauerhaft verborgene Auth-UI ergänzen oder anpassen
    - **Property 5: Auth-UI bleibt für jeden Sessionzustand verborgen**
    - Sessionzustände ohne gültige Sitzung, nach erfolgreicher Wiederherstellung, nach Code-/Token-Verarbeitung und nach Logout mit bestehenden Mocks abdecken.
    - Für alle Zustände `#user-info.hidden === true` und `#logout-button.hidden === true` prüfen; die bestehende Login-Zustandslogik und interne Auth-Verarbeitung dürfen nicht verändert werden.
    - Veraltete Erwartungen, die den Logout-Button nach Authentifizierung sichtbar machen, auf den neuen Vertrag umstellen.
    - **Validates: Requirements 1.1, 1.3**

  - [ ]* 1.4 Unit-/Integration-Regression für Login-Control und Auth-Fluss aktualisieren
    - In `tests/app.test.js` bestehendes Label und Aktivierung von `#login-button` prüfen.
    - Die vorhandene PKCE-Weiterleitung bzw. den bestehenden Login-Aufruf mit Mocks verifizieren, ohne den Auth-Fluss zu ersetzen.
    - Logout- und Fehler-Reset weiterhin testen; nur die Sichtbarkeit von Status-/Logout-UI gemäß neuem Vertrag ändern.
    - _Requirements: 1.2, 1.3, 5.2_

- [x] 2. Gemeinsame proportionale CSS-Skalierung implementieren
  - [x] 2.1 Gemeinsamen Skalierungsfaktor in `style.css` einführen und alle Zielmaße daraus ableiten
    - Eine interne CSS-Custom-Property für `s` mit einem Wert größer als `1` definieren; keine Benutzereingabe oder Laufzeitkonfiguration verwenden.
    - `.artist-label` (`0.85rem`), `.date-label` (`0.7rem`) und `#grid-container`-`gap` (`16px`) über denselben Faktor ableiten.
    - Equalizer-Breite (`4px`), Balkenabstand (`3px`) und maximale Höhe (`20px`) über denselben Faktor ableiten.
    - Bestehende Overflow-Regeln, `display: grid`, `grid-template-columns`, `aspect-ratio: 1`, Ausrichtung, responsive Regeln, Equalizer-Keyframes und unterschiedliche `animation-delay`-Werte unverändert erhalten.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 4.2, 4.3, 5.4_

  - [x]* 2.2 Property-Test für konsistente Grid- und Label-Abstände erstellen
    - **Property 3: Konsistente Grid-Abstände**
    - In einer CSS-Prüfung die vorhandenen Selektoren und die Baseline-Konstanten aus dem Design statisch auslesen bzw. prüfen.
    - Für Label-/Bildabstände sowie horizontalen und vertikalen Grid-Abstand den Quotienten aktuell zu Baseline ermitteln und einen gemeinsamen Faktor `s > 1` verlangen.
    - Keine festen Zielwerte als Implementierungsvertrag testen; die gemeinsame Ableitung über die CSS-Custom-Property muss maßgeblich sein.
    - **Validates: Requirements 3.1, 3.2, 5.3, 5.4**

  - [-]* 2.3 Property-Test für gemeinsam skalierte Equalizer-Maße erstellen
    - **Property 4: Equalizer-Maße skalieren gemeinsam**
    - Breite, Abstand und maximale Höhe aus den vorhandenen Equalizer-Custom-Properties gegen `4px`, `3px` und `20px` vergleichen.
    - Für alle drei Quotienten denselben Wert `s > 1` verlangen und prüfen, dass die Werte in `.equalizer` wirksam werden.
    - CSS-Animation, Keyframes und gestaffelte Verzögerungen als unverändert vorhandene Regeln absichern.
    - **Validates: Requirements 4.2, 4.3, 5.3, 5.4**

  - [~]* 2.4 CSS-Selektor-, Layout- und Animationsregression ergänzen
    - In einer fokussierten CSS-Unit-/Regressionprüfung sicherstellen, dass `.artist-label`, `.date-label`, `#grid-container`, `.grid-item-image .overlay`, `.equalizer` und `.equalizer .bar` vorhanden bleiben.
    - `display: grid`, bestehende Spalten-/Ausrichtungsregeln, `aspect-ratio: 1`, Overflow-Deklarationen, `@keyframes equalize` und fehlende JavaScript-Animationsloops prüfen.
    - _Requirements: 2.3, 2.4, 3.3, 4.3, 5.3, 5.4_

- [x] 3. Bestehende Renderer-Verträge und Wiedergabe-Integration absichern
  - [x]* 3.1 Property-Test für Label-Struktur und proportionale Textskalierung erweitern
    - **Property 1: Label-Struktur und proportionale Textskalierung**
    - Bestehende Renderer-Propertytests für beliebige gültige Künstlerdaten so ergänzen, dass `.artist-label` direkt nach `.grid-item-image` und `.date-label` bei vorhandenem Datum direkt danach steht.
    - Den gemeinsamen Schrift-Skalierungsquotienten für Künstler- und Datumslabel gegenüber den Baselines prüfen, ohne Änderungen an `js/grid-renderer.js` zu verlangen.
    - **Validates: Requirements 2.1, 2.2**

  - [x]* 3.2 Property-Test für vollständige Inhalte und unveränderten Overflow erweitern
    - **Property 2: Label-Inhalte und Overflow-Invariante**
    - Bestehende Tests für `artist.name` und `artist.date` um beliebig lange sowie Sonderzeichen enthaltende Texte ergänzen.
    - Exakte `textContent`-Bewahrung und die Kombination aus `white-space: nowrap`, `overflow: hidden` und `text-overflow: ellipsis` prüfen.
    - **Validates: Requirements 2.3, 2.4**

  - [~]* 3.3 Property-Test für Equalizer-Overlay-Lebenszyklus zusammenführen
    - **Property 6: Overlay bleibt auf den Bildbereich begrenzt**
    - Bestehende Overlay-Properties für zufällige Künstler-IDs und Zustandsfolgen so abdecken, dass beim Start höchstens bzw. genau ein Overlay ausschließlich im passenden `.grid-item-image` entsteht.
    - Nach `hideOverlay()` vollständige Entfernung prüfen sowie CSS-Animation und unterschiedliche Startverzögerungen ohne JavaScript-Animationsloop absichern.
    - **Validates: Requirements 4.1, 4.3, 4.4**

  - [ ]* 3.4 Integrationsregression für Markup, Datum, Grid und Wiedergabe aktualisieren
    - Bestehende `integration.test.js`, `date-display-integration.test.js` und gegebenenfalls Session-/App-Fixtures auf den neuen Auth-Visibility-Vertrag ausrichten.
    - Den unveränderten Datenfluss Validator → App-Enrichment → Renderer mit Artist- und Date-Labels sowie die bestehende Overlay-Anzeige/-Entfernung prüfen.
    - Sicherstellen, dass Login-/Session-/Token-/Player-Regressionen und vorhandene Grid-/Datums-/Wiedergabetests gemeinsam ausführbar bleiben.
    - _Requirements: 1.3, 2.1, 2.2, 2.3, 2.4, 4.1, 4.4, 5.1, 5.2_

- [~] 4. Checkpoint – vollständige Test-Suite ausführen
  - `npm test` bzw. `vitest --run` ausführen und alle bestehenden Unit-, Property-Based- und Integrationstests erfolgreich abschließen.
  - Bei Fehlern nur die für den neuen Sichtbarkeits-/Skalierungsvertrag veralteten Erwartungen oder Test-Fixtures korrigieren; keine Nicht-Ziel-Module umbauen.
  - _Requirements: 5.1_

## Notes

- Aufgaben mit `*` sind optionale Testaufgaben und können für ein schnelleres MVP übersprungen werden; die Implementierungsaufgaben ohne `*` sind erforderlich.
- Die bestehenden Tests für `js/grid-renderer.js`, TokenManager, SpotifyAPI, SpotifyPlayer, Sessionverwaltung, Datumsanzeige und Overlay bleiben Regressionstests.
- `js/grid-renderer.js` wird nicht geändert: DOM-Reihenfolge, `textContent`, Overlay-Lebenszyklus und Equalizer-Bar-Erzeugung sind bestehende Verträge.
- Der Skalierungsfaktor ist ausschließlich eine interne CSS-Konstante; die Tests prüfen Relationen/Quotienten statt benutzerdefinierter fixer Zielwerte.
- Jede Property ist als separater Testschritt ausgewiesen und verweist auf ihre Design-Property sowie die zugehörigen Requirements.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["1.2", "2.2", "2.3", "3.1", "3.2", "3.3"] },
    { "id": 2, "tasks": ["1.3", "2.4"] },
    { "id": 3, "tasks": ["1.4", "3.4"] }
  ]
}
```
