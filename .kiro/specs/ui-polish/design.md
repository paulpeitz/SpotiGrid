# Technisches Design: UI-Polish

## Overview

Die Änderung ist ein kleiner, reversibler CSS-/Markup-Patch für die bestehende SpotiGrid-Anwendung. Die Authentifizierungs-, Token-, API- und Player-Architektur bleibt unverändert. Sichtbar bleibt ausschließlich der bestehende Login-Control; die vorhandenen Elemente `#user-info` und `#logout-button` bleiben aus Kompatibilitäts- und Rückrollgründen im Markup, werden aber in jedem Zustand verborgen gehalten.

Die visuelle Skalierung wird über einen gemeinsamen, internen CSS-Skalierungsfaktor modelliert. Alle betroffenen Baseline-Maße werden daraus abgeleitet, statt voneinander unabhängige Zielwerte einzuführen. Der Faktor ist ein Design-Konstantenwert, keine Benutzereingabe und keine Laufzeitkonfiguration.

**Nicht-Ziele:** keine Umstellung des OAuth-/PKCE-Flows, keine Änderung von TokenManager, SpotifyAPI oder SpotifyPlayer, keine neue Auth-UI, kein Umbau des Grid-Renderers, keine JavaScript-Animationsschleife und keine Änderung am Overlay-Lebenszyklus.

## Architecture

### 2.1 Komponenten

- `index.html`: stellt `#login-button`, `#user-info` und `#logout-button` im bestehenden `#auth-section` bereit.
- `js/app.js`: orchestriert Session-Wiederherstellung, Login, Logout, API, Player und Grid. Die Änderung beschränkt sich auf die Sichtbarkeitszuweisungen der beiden nicht mehr sichtbaren Controls.
- `js/grid-renderer.js`: rendert Bildbereich, Künstlername, optionales Datum sowie das Equalizer-Overlay. DOM-Struktur, Textinhalte, `showOverlay` und `hideOverlay` bleiben unverändert.
- `style.css`: enthält den einzigen visuellen Änderungsbereich. Die vorhandenen Selektoren und Animations-Keyframes bleiben erhalten.
- `tests/`: erhält gezielte Markup-/Visibility- und CSS-Regeltests; alle bestehenden Tests bleiben Regressionstests.

### 2.2 Datenfluss

1. `App.init()` stellt weiterhin eine Session über `TokenManager.restore()` wieder her oder richtet den bestehenden Login-Handler ein.
2. Nach erfolgreicher Authentifizierung ruft `App._onAuthenticated()` weiterhin API, Player und Grid-Laden in derselben Reihenfolge auf.
3. `GridRenderer.render(artists)` erzeugt weiterhin pro Künstler einen `.grid-item` mit `.grid-item-image`, `.artist-label` und optional `.date-label`.
4. `App.handleArtistClick()` steuert weiterhin `showOverlay()` und `hideOverlay()`; die Animation wird ausschließlich durch CSS ausgeführt.

## 3. Visuelles Skalierungskonzept

In `style.css` wird im Bereich der Grid-/Equalizer-Regeln ein gemeinsamer Faktor `s` als CSS-Custom-Property definiert, beispielsweise `--ui-polish-scale: 1.1`. Der konkrete Wert ist ein kleiner Designwert größer als `1`, wird nur im Stylesheet gepflegt und darf nicht aus Benutzereingaben stammen.

Die Ableitungen verwenden die Baseline-Werte aus der bestehenden Datei:

| Maß | Baseline | abgeleitete Regel |
|---|---:|---|
| `.artist-label` Schriftgröße | `0.85rem` | `calc(0.85rem * var(--ui-polish-scale))` |
| `.date-label` Schriftgröße | `0.7rem` | `calc(0.7rem * var(--ui-polish-scale))` |
| `#grid-container` gap | `16px` | `calc(16px * var(--ui-polish-scale))` |
| `--equalizer-bar-width` | `4px` | `calc(4px * var(--ui-polish-scale))` |
| `--equalizer-bar-gap` | `3px` | `calc(3px * var(--ui-polish-scale))` |
| `--equalizer-max-height` | `20px` | `calc(20px * var(--ui-polish-scale))` |

Zusammengehörige Maße verwenden denselben Quotienten. Dadurch kann die Test-Suite den Faktor als Quotient aktueller zu Baseline-Maß prüfen, ohne feste Zielwerte in der Anwendung zu benötigen. `grid-template-columns`, `max-width`, `aspect-ratio: 1`, Flex-Ausrichtung und responsive Regeln werden nicht verändert; die bestehende Zell-/Zeilenstruktur bleibt damit stabil.

## 4. Auth-UI-Änderung

### 4.1 Markup-Vertrag

`index.html` behält die bestehende Struktur und IDs. Die Attribute `hidden` an `#user-info` und `#logout-button` bleiben gesetzt. Die Elemente werden nicht entfernt, um bestehende Selektoren, Tests und eine spätere Rücknahme der UI-Entscheidung nicht zu brechen.

`#login-button` behält Typ, Label, Position im `#auth-section` und seine bestehende Event-Verknüpfung. Es wird kein alternatives Login-Element eingeführt.

### 4.2 Zustandsverhalten in `App`

- `_setupLoginButton()` bleibt unverändert und zeigt den Login-Control im nicht authentifizierten Zustand wie bisher.
- `_onAuthenticated()` blendet `#login-button` wie bisher aus, setzt `#user-info` jedoch weiterhin auf `hidden = true` und lässt `#logout-button` auf `hidden = true`. Die bisherige Session-Initialisierung, Player-Verbindung und Grid-Ladung bleiben in derselben Reihenfolge.
- `logout()` löscht weiterhin Playback und Session-Daten und setzt den Login-Control sichtbar. Die bestehenden Rücksetzungen für `#user-info` und `#logout-button` bleiben als explizite versteckte Zustandszuweisungen erhalten.
- Der bisherige Logout-Handler kann aus Rückwärtskompatibilitätsgründen bestehen bleiben; die Controls sind durch `hidden` nicht über die sichtbare UI erreichbar. Es wird kein neuer sichtbarer Auslöser geschaffen.

Damit ist die UI-Änderung auf Sichtbarkeit beschränkt. Fehler aus Session-Wiederherstellung, Token-Austausch, Player-Verbindung und Grid-Laden werden weiterhin über die vorhandenen Pfade behandelt.

## Components and Interfaces

### 5.1 Renderer-Schnittstelle

Die bestehende öffentliche Schnittstelle bleibt unverändert:

```js
class GridRenderer {
  constructor(container) {}
  render(artists) {}
  showOverlay(artistId) {}
  hideOverlay(artistId) {}
  markNoPreview(artistId) {}
}
```

`artists` bleibt eine Liste von Objekten mit mindestens `id`, `name` und `imageUrl`; `date` bleibt optional. `render()` setzt `textContent` weiterhin direkt aus `artist.name` bzw. `artist.date`, sodass vollständige Inhalte und sichere Textbehandlung erhalten bleiben. Die Reihenfolge bleibt:

```text
.grid-item
└── .grid-item-image
    └── optional: img oder .placeholder-name
├── .artist-label
└── optional: .date-label
```

### 5.2 Equalizer-Lebenszyklus

`showOverlay(artistId)` fügt genau ein `.overlay` als Kind des `.grid-item-image` der Zielkachel ein und erzeugt weiterhin `EQUALIZER_BAR_COUNT` Balken. Die Staffelung bleibt über individuelle `animation-delay`-Werte pro Balken erhalten. `hideOverlay(artistId)` entfernt das `.overlay`-Element vollständig aus demselben Bildbereich. Es wird keine Animationslogik in `app.js` oder `grid-renderer.js` ergänzt.

Die CSS-Regel `.grid-item-image .overlay` bleibt für Positionierung, Größe, Zentrierung, Opazität und Übergang zuständig. Die CSS-Keyframes `equalize` und die `animation`-Deklaration der Balken bleiben unverändert; nur die drei Größen-/Abstandsvariablen werden aus `s` abgeleitet.

## Data Models

Es gibt keine neuen externen Schnittstellen, Endpunkte, persistenten Felder oder Datenmigrationen. Die unveränderten Verträge sind:

- DOM-IDs: `login-button`, `user-info`, `logout-button`, `grid-container`.
- Auth-Schnittstelle: `TokenManager.restore()`, `save()`, `clear()` sowie der bestehende PKCE-Redirect.
- Renderer-Daten: `{ id: string, name: string, imageUrl: string|null, date?: string }`.
- Overlay-Selektoren: `.grid-item`, `.grid-item-image`, `.overlay`, `.equalizer`, `.bar`.
- CSS-Baseline für Vergleichstests: `0.85rem`, `0.7rem`, `16px`, `4px`, `3px`, `20px`.

Die CSS-Custom-Property für `s` ist eine interne Darstellungsabstraktion und kein Bestandteil eines JavaScript- oder Nutzer-API-Vertrags.

## Error Handling

Die Änderung führt keine neuen asynchronen Operationen und keine neuen Fehlerquellen in Authentifizierung oder Wiedergabe ein. Fehlt ein Ziel-Element, bleiben die vorhandenen Nullprüfungen in `app.js` und `grid-renderer.js` wirksam. Ungültige Künstlerdaten, fehlende Bilder, fehlende Vorschauen und Player-Fehler werden weiterhin über die bestehenden Pfade behandelt.

Beim Rückrollen werden nur die CSS-Ableitungen durch die ursprünglichen Werte ersetzt und die ursprünglichen Sichtbarkeitszuweisungen in `app.js` wiederhergestellt. Da IDs, DOM-Struktur, Renderer-Schnittstelle und Datenmodell bestehen bleiben, ist kein Daten- oder Migrationsschritt nötig.

## Testing Strategy

Die Test-Suite verwendet weiterhin Vitest, JSDOM und fast-check. Property-Tests laufen mit mindestens 100 Iterationen; jeder Property-Test erhält einen Kommentar im Format `Feature: ui-polish, Property N: ...` und verweist auf die jeweilige Design-Eigenschaft.

### 8.1 Beispiel- und Integrationstests

- Markup-/Visibility-Test: lädt `index.html` bzw. die App-DOM-Fixture und prüft für nicht authentifizierten und authentifizierten Zustand `hidden === true` für `#user-info` und `#logout-button`.
- Login-Regression: prüft das unveränderte Label, die Aktivierung des `#login-button` und die bestehende PKCE-Weiterleitung.
- Overlay-Regression: prüft genau ein Overlay im Zielbildbereich nach `showOverlay()` und kein Overlay nach `hideOverlay()`.
- Layout-Regression: prüft `display: grid`, bestehende Spalten-/Ausrichtungsregeln, `aspect-ratio: 1` und repräsentative responsive Zustände.
- Vollständiger Regressionlauf: `npm test` bzw. `vitest --run` führt alle bestehenden Unit-, Property-Based- und Integrationstests aus.

### 8.2 Property-Tests

Die neuen bzw. angepassten Tests konzentrieren sich auf folgende universelle Invarianten:

1. Renderer-Reihenfolge und vollständige Label-Inhalte für beliebige gültige Künstlerdaten.
2. Identischer Skalierungsquotient für Künstler-/Datums-Schriftgrößen und Grid-/Label-Abstände gegenüber der Baseline.
3. Unveränderte Overflow-Regeln für beliebig lange Künstler- und Datumstexte.
4. Einheitlicher Equalizer-Skalierungsquotient für Breite, Abstand und Höhe.
5. Vorhandensein der betroffenen Selektoren, CSS-Animation und gestaffelter Verzögerungen ohne JavaScript-Animationsloop.

CSS-Tests dürfen die aktuelle Datei statisch auslesen und die Baseline-Werte als Testkonstanten führen. Der Test prüft die Quotienten und die gemeinsame Ableitung; er schreibt keine Zielwerte in die Anwendung.

## Correctness Properties

*Eine Property ist eine Eigenschaft, die für alle gültigen Eingaben oder Zustände gelten muss. Die Properties verbinden die Anforderungen mit automatisierbaren, wiederholbaren Prüfungen.*

### Property 1: Label-Struktur und proportionale Textskalierung

**Für alle** gültigen Künstlerobjekte muss der gerenderte `.artist-label` unmittelbar nach `.grid-item-image` stehen; wenn ein Datum vorhanden ist, muss `.date-label` unmittelbar danach stehen, und die Schriftgrößen beider Labels müssen gegenüber ihren Baseline-Werten denselben Skalierungsquotienten `s > 1` verwenden.

**Validates: Requirements 2.1, 2.2**

### Property 2: Label-Inhalte und Overflow-Invariante

**Für alle** gültigen Künstlernamen und konfigurierten Datumstexte muss `textContent` der jeweiligen gerenderten Labels exakt dem Eingabetext entsprechen; die bestehende Kombination aus `white-space: nowrap`, `overflow: hidden` und `text-overflow: ellipsis` muss unabhängig von der Textlänge erhalten bleiben.

**Validates: Requirements 2.3, 2.4**

### Property 3: Konsistente Grid-Abstände

**Für alle** betroffenen Layout-Maße muss der Quotient aus aktuellem Wert und Baseline-Wert denselben Skalierungsfaktor `s > 1` ergeben: für Label-/Bildabstände sowie für horizontalen und vertikalen `#grid-container`-Abstand.

**Validates: Requirements 3.1, 3.2, 5.3, 5.4**

### Property 4: Equalizer-Maße skalieren gemeinsam

**Für alle** Equalizer-Balken müssen Breite, Abstand und maximale Höhe gegenüber `4px`, `3px` und `20px` jeweils denselben Skalierungsquotienten `s > 1` verwenden; die Werte müssen über die vorhandenen CSS-Custom-Properties in `.equalizer` wirksam werden.

**Validates: Requirements 4.2, 5.3, 5.4**

### Property 5: Auth-UI bleibt für jeden Sessionzustand verborgen

**Für alle** unterstützten Sessionzustände muss `#user-info.hidden` und `#logout-button.hidden` wahr sein, während die bestehende Login-Zustandslogik und die interne Authentifizierungsverarbeitung unverändert funktionieren.

**Validates: Requirements 1.1, 1.3**

### Property 6: Overlay bleibt auf den Bildbereich begrenzt

**Für alle** gerenderten Künstler-IDs darf eine aktive Wiedergabe höchstens ein `.overlay` im `.grid-item-image` des zugehörigen Künstlers erzeugen; nach `hideOverlay()` darf dort kein `.overlay` mehr vorhanden sein. Die vorhandene CSS-Animation und unterschiedliche Startverzögerungen bleiben dabei erhalten.

**Validates: Requirements 4.1, 4.3, 4.4**

## Property-Reflection und Konsolidierung

Die zunächst einzeln bewerteten Kriterien 2.1 und 2.2 werden in Property 1 zusammengeführt, weil sie dieselbe DOM-Reihenfolge und denselben Skalierungsfaktor für zwei Labeltypen prüfen. Kriterien 2.3 und 2.4 werden in Property 2 kombiniert, weil beide die gleiche Text-/Overflow-Invariante für unterschiedliche Inhalte darstellen.

Kriterien 3.1, 3.2, 5.3 und 5.4 werden in Property 3 über Quotienten und gemeinsame Ableitung gebündelt; getrennte Prüfungen derselben Maßrelation wären redundant. Die drei Equalizer-Maße aus 4.2 bilden gemeinsam Property 4. Die Overlay-Erzeugung, CSS-Staffelung und Entfernung gehören als ein Lebenszyklus in Property 6, während die konkrete Auth-Zustandsmatrix und der unveränderte Login-Ablauf als Beispiel-/Integrationstests ergänzt werden. Dadurch bleibt jede Property eigenständig aussagekräftig, ohne doppelte Tests zu spezifizieren.
